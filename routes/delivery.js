const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- A. Dispatcher Operations ---

// 0. Mobile Login (Simple Phone + PIN Auth)
router.post('/login', async (req, res) => {
    const { phone, pin } = req.body;
    try {
        const result = await pool.query(`
            SELECT 
                e.id, e.full_name, e.contact_primary, e.designation, e.login_pin,
                dt.id as team_id, dt.name as team_name, dt.vehicle_id
            FROM employees e, delivery_teams dt
            WHERE e.id = dt.driver_id AND dt.is_active = true
            AND e.contact_primary = $1 AND e.employment_status = 'Active'
            UNION
            SELECT 
                e.id, e.full_name, e.contact_primary, e.designation, e.login_pin,
                NULL as team_id, NULL as team_name, NULL as vehicle_id
            FROM employees e
            WHERE e.contact_primary = $1 AND e.employment_status = 'Active'
            AND NOT EXISTS (SELECT 1 FROM delivery_teams dt WHERE dt.driver_id = e.id AND dt.is_active = true)
        `, [phone]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid Phone Number or Account Inactive' });
        }

        const user = result.rows[0];

        // Verify PIN
        if (!user.login_pin || user.login_pin !== pin) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        // Remove sensitive data before returning
        delete user.login_pin;

        res.json({ success: true, user: user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1. Get Pool of Pending Invoices (Modified to include DSE)
// Query: "All Invoiced bills, not delivered"
router.get('/invoices-pool', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                si.id, si.invoice_number, si.invoice_date, si.grand_total,
                si.delivery_status,
                c.customer_name, c.latitude, c.longitude, c.route_sequence,
                rt.route_name,
                dse.full_name as dse_name -- Crucial for sorting
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            LEFT JOIN routes rt ON c.route_id = rt.id
            LEFT JOIN sales_orders so ON si.sales_order_id = so.id
            LEFT JOIN employees dse ON so.dse_id = dse.id
            WHERE si.delivery_status IN ('Pending', 'Partial') -- Not Delivered yet
            ORDER BY rt.route_name, dse.full_name, c.route_sequence
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Delivery Teams
router.get('/teams', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT dt.id, dt.name, dt.driver_id, e.full_name as driver_name, v.vehicle_number 
            FROM delivery_teams dt
            LEFT JOIN employees e ON dt.driver_id = e.id
            LEFT JOIN vehicles v ON dt.vehicle_id = v.id
            WHERE dt.is_active = true
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Create Trip & Assign Invoices (Updated for Teams)
router.post('/trips', async (req, res) => {
    const { team_id, driver_id, vehicle_number, invoice_ids, created_by } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Validate Invoice IDs Existence
        const invCheck = await client.query(`
            SELECT id FROM sales_invoices WHERE id = ANY($1)
        `, [invoice_ids]);

        if (invCheck.rows.length !== invoice_ids.length) {
            const foundIds = invCheck.rows.map(r => r.id);
            const missingIds = invoice_ids.filter(id => !foundIds.includes(String(id)) && !foundIds.includes(Number(id)));
            throw new Error(`Invalid Invoice IDs: ${missingIds.join(', ')}. They do not exist in sales_invoices.`);
        }

        // Create Trip
        const tripRes = await client.query(`
            INSERT INTO delivery_trips (trip_number, team_id, driver_id, vehicle_number, created_by, status)
            VALUES ('TRIP-' || to_char(now(), 'YY-MM-DD-HH24MI'), $1, $2, $3, $4, 'Scheduled')
            RETURNING id, trip_number
        `, [team_id || null, driver_id, vehicle_number, created_by]);

        const tripId = tripRes.rows[0].id;

        // Assign Invoices
        for (const invId of invoice_ids) {
            await client.query(`
                INSERT INTO trip_invoices (trip_id, invoice_id, delivery_status)
                VALUES ($1, $2, 'Pending')
            `, [tripId, invId]);

            // Update Invoice Status
            await client.query(`
                UPDATE sales_invoices SET delivery_status = 'In Transit' WHERE id = $1
            `, [invId]);
        }

        await client.query('COMMIT');
        res.json({ success: true, trip_id: tripId, trip_number: tripRes.rows[0].trip_number });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 4. Get Active Trips (List)
router.get('/trips', async (req, res) => {
    try {
        const statusFilter = req.query.status ? [req.query.status] : ['Scheduled', 'In Transit'];
        const driverId = req.query.driver_id;

        let query = `
            SELECT 
                dt.id, dt.trip_number, dt.status, dt.created_at,
                t.name as team_name, e.full_name as driver_name, dt.vehicle_number,
                COUNT(ti.id) as invoice_count
            FROM delivery_trips dt
            LEFT JOIN delivery_teams t ON dt.team_id = t.id
            LEFT JOIN employees e ON dt.driver_id = e.id
            LEFT JOIN trip_invoices ti ON dt.id = ti.trip_id
            WHERE dt.status = ANY($1)
        `;

        const params = [statusFilter];

        if (driverId) {
            query += ` AND dt.driver_id = $2`;
            params.push(driverId);
        }

        query += ` GROUP BY dt.id, dt.trip_number, dt.status, dt.created_at, t.name, e.full_name, dt.vehicle_number
                   ORDER BY dt.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- B. Warehouse Operations ---

// 5a. Get Picklist Item Breakdown (Who ordered what?)
router.get('/trips/:id/product-breakdown', async (req, res) => {
    const { product_id, mrp } = req.query; // [CHANGED] product_code -> product_id
    try {
        const result = await pool.query(`
            SELECT 
                c.customer_name, 
                si.invoice_number,
                sil.shipped_qty as qty,
                sil.mrp
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            JOIN sales_invoice_lines sil ON si.id = sil.invoice_id
            WHERE ti.trip_id = $1 
              AND sil.product_id = $2
              AND sil.mrp = $3
            ORDER BY c.customer_name
        `, [req.params.id, product_id, mrp]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Get Picklist (Aggregated)
router.get('/trips/:id/picklist', async (req, res) => {
    try {
        // Aggregate Qty by Product across all invoices in trip
        const result = await pool.query(`
            SELECT 
                p.id as product_id, -- [ADDED] product_id
                p.product_name, p.product_code,
                sil.mrp,
                SUM(sil.shipped_qty) as total_qty,
                string_agg(DISTINCT ib.batch_code, ', ') as batches
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN sales_invoice_lines sil ON si.id = sil.invoice_id
            JOIN products p ON sil.product_id = p.id
            LEFT JOIN inventory_batches ib ON sil.batch_id = ib.id
            WHERE ti.trip_id = $1
            GROUP BY p.id, p.product_name, p.product_code, sil.mrp
            ORDER BY p.product_name, sil.mrp
        `, [req.params.id]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- C. Mobile Action Hub (Detailed Execution) ---

// 6. Get Invoice Lines (View Items)
router.get('/invoices/:id/lines', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                sil.id, sil.product_id, p.product_name, p.product_code,
                sil.shipped_qty as qty, sil.rate, sil.amount, sil.mrp,
                ib.batch_code, sil.batch_id
            FROM sales_invoice_lines sil
            JOIN products p ON sil.product_id = p.id
            LEFT JOIN inventory_batches ib ON sil.batch_id = ib.id
            WHERE sil.invoice_id = $1
            ORDER BY p.product_name
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Get Customer Pending Invoices (Collect Payment > Other Bills)
router.get('/customers/:id/pending-invoices', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id, invoice_number, invoice_date, 
                grand_total, balance_amount, delivery_status
            FROM sales_invoices
            WHERE customer_id = $1 
              AND balance_amount > 0 
              AND delivery_status != 'Cancelled'
            ORDER BY invoice_date ASC
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Get Customer Invoice History (Any Bill Return)
// Searchable by Invoice Number or Date
router.get('/customers/:id/history', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                id, invoice_number, invoice_date, grand_total, delivery_status
            FROM sales_invoices
            WHERE customer_id = $1 AND delivery_status != 'Cancelled'
        `;

        const params = [req.params.id];
        if (search) {
            query += ` AND (invoice_number ILIKE $2 OR to_char(invoice_date, 'YYYY-MM-DD') ILIKE $2)`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY invoice_date DESC LIMIT 20`; // Limit for mobile performance

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- D. Mobile App Operations ---

// 6. Get Manifest (Detailed Route)
// Sorted by efficient route (or sequence)
router.get('/trips/:id/manifest', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                ti.id as trip_invoice_id,
                si.id as invoice_id, si.invoice_number, si.grand_total, si.balance_amount,
                c.id as customer_id, c.customer_name, 
                -- Customer Addresses Join for Address Line 1
                (SELECT address_line1 FROM customer_addresses WHERE customer_id = c.id LIMIT 1) as address,
                c.latitude, c.longitude, c.customer_phone as phone,
                ti.delivery_status,
                so.notes as instructions -- DSE Instructions
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            LEFT JOIN sales_orders so ON si.sales_order_id = so.id
            WHERE ti.trip_id = $1
            ORDER BY c.route_sequence ASC
        `, [req.params.id]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Sync Delivery Data (End of Day / Live)
router.post('/sync', async (req, res) => {
    const { trip_id, updates, payments, returns, expenses, denominations } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create Master Sync Log (The "Header")
        const summary = {
            updates_count: updates?.length || 0,
            payments_count: payments?.length || 0,
            returns_count: returns?.length || 0,
            expenses_count: expenses?.length || 0,
            has_denominations: !!denominations
        };

        const syncRes = await client.query(
            "INSERT INTO sync_logs (trip_id, payload_summary, sync_type) VALUES ($1, $2, 'Delivery') RETURNING id",
            [trip_id, JSON.stringify(summary)]
        );
        const syncId = syncRes.rows[0].id;
        console.log(`Master Sync ID Created: ${syncId} for Trip ${trip_id}`);

        // 2. Update Trip Global Status (Awaiting Verification)
        await client.query(`
            UPDATE delivery_trips 
            SET status = 'Completed', end_time = NOW(), updated_at = NOW() 
            WHERE id = $1
        `, [trip_id]);

        // 3. Process Manifest Updates (Deliveries)
        if (updates && Array.isArray(updates)) {
            for (const update of updates) {
                // Update Junction Table + Link Sync ID
                await client.query(`
                    UPDATE trip_invoices 
                    SET delivery_status = $1, 
                        delivery_time = $2, 
                        submitted_at = NOW(),
                        sync_id = $3,
                        verification_status = 'Pending'
                    WHERE trip_id = $4 AND invoice_id = $5
                `, [update.status, update.timestamp, syncId, trip_id, update.invoice_id]);

                // Update Master Invoice Table Status
                await client.query(`
                    UPDATE sales_invoices 
                    SET delivery_status = $1
                    WHERE id = $2
                `, [update.status, update.invoice_id]);
            }
        }

        // 4. Process Payments
        if (payments && Array.isArray(payments)) {
            for (const p of payments) {
                const yy = new Date().getFullYear().toString().slice(-2);
                const seqRes = await client.query("SELECT COUNT(*) FROM customer_payments WHERE payment_number LIKE $1", [`PAY-${yy}-%`]);
                const nextSeq = parseInt(seqRes.rows[0].count) + 1;
                const payNumber = `PAY-${yy}-${String(nextSeq).padStart(4, '0')}`;

                const payRes = await client.query(`
                    INSERT INTO customer_payments (
                        payment_number, customer_id, amount, payment_mode, transaction_ref, 
                        collected_by, payment_date, verification_status, status, sync_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'Pending', 'Pending', $7)
                    RETURNING id
                `, [payNumber, p.customer_id, p.amount, p.mode, p.transaction_ref || p.bank_name, p.collected_by, syncId]);

                const paymentId = payRes.rows[0].id;

                await client.query(`
                    INSERT INTO payment_allocations (payment_id, invoice_id, amount, status)
                    VALUES ($1, $2, $3, 'PENDING')
                `, [paymentId, p.invoice_id, p.amount]);
            }
        }

        // 5. Process Returns (Dual Flow: Instant vs Expiry)
        if (returns && Array.isArray(returns)) {
            for (const r of returns) {
                const invId = (r.invoice_id && !isNaN(r.invoice_id)) ? r.invoice_id : null;
                const batchId = (r.batch_id && !isNaN(r.batch_id)) ? r.batch_id : null;
                const customerId = r.customer_id || null;

                await client.query(`
                    INSERT INTO trip_returns (
                        trip_id, invoice_id, product_id, customer_id, return_type, qty, reason, 
                        verification_status, batch_id, condition, sync_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', $8, $9, $10)
                `, [
                    trip_id,
                    invId,
                    r.product_id,
                    customerId,
                    r.return_type || 'Instant Rejection',
                    r.qty,
                    r.reason || 'Customer Rejected',
                    batchId,
                    r.condition || null,
                    syncId
                ]);
            }
        }

        // 6. Process Expenses
        if (expenses && Array.isArray(expenses)) {
            for (const e of expenses) {
                await client.query(`
                    INSERT INTO dse_expenses (dse_id, expense_type, amount, description, status, sync_id)
                    VALUES ($1, $2, $3, $4, 'Pending', $5)
                `, [e.collected_by || e.dse_id, e.type || e.mode, e.amount, e.description || 'Trip Expense', syncId]);
            }
        }

        // 7. Process Denominations
        if (denominations && denominations.total_verified > 0) {
            await client.query(`
                INSERT INTO cash_denominations (
                    dse_id, report_date, note_500, note_200, note_100, 
                    note_50, note_20, note_10, coins, total_amount, sync_id
                ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                denominations.dse_id || (updates?.[0]?.collected_by),
                denominations.n500 || 0,
                denominations.n200 || 0,
                denominations.n100 || 0,
                denominations.n50 || 0,
                denominations.n20 || 0,
                denominations.n10 || 0,
                denominations.coins || 0,
                denominations.total_verified,
                syncId
            ]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: "Sync successful", sync_id: syncId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sync Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- D. Verification ---

// 8. Get Trip Returns (Verification View)
router.get('/trips/:id/returns', async (req, res) => {
    try {
        const result = await pool.query(`
SELECT
tr.id, tr.return_type, tr.qty, tr.reason, tr.verification_status,
    p.product_name, si.invoice_number
            FROM trip_returns tr
            JOIN products p ON tr.product_id = p.id
            LEFT JOIN sales_invoices si ON tr.invoice_id = si.id
            WHERE tr.trip_id = $1
    `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. Verify Trip (Manager Approval Gate)
router.post('/trips/:id/verify', async (req, res) => {
    const { id } = req.params;
    const { return_actions, verified_by } = req.body;
    // return_actions: [{ return_id, action: 'Approve' | 'Reject' }]

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Process Approved Returns (Financial Adjustment)
        if (return_actions && Array.isArray(return_actions)) {
            for (const action of return_actions) {
                const isApproved = action.action === 'Approve';

                // A. Update Verification Status
                const retRes = await client.query(`
                    UPDATE trip_returns 
                    SET verification_status = $1, verified_by = $2, verified_at = NOW()
                    WHERE id = $3
                    RETURNING *
                `, [isApproved ? 'Approved' : 'Rejected', verified_by, action.return_id]);

                if (isApproved && retRes.rows.length > 0) {
                    const ret = retRes.rows[0];

                    // B. Get Product/Invoice details for financial value
                    const lineRes = await client.query(`
                        SELECT sil.rate, sil.tax_percent 
                        FROM sales_invoice_lines sil 
                        WHERE sil.invoice_id = $1 AND sil.product_id = $2
                        LIMIT 1
                    `, [ret.invoice_id, ret.product_id]);

                    const rate = Number(lineRes.rows[0]?.rate || 0);
                    const taxPct = Number(lineRes.rows[0]?.tax_percent || 0);
                    const taxable = Number(ret.qty) * rate;
                    const tax = taxable * (taxPct / 100);
                    const total = taxable + tax;

                    // C. Create Official Sales Return (Credit Note)
                    const yy = new Date().getFullYear().toString().slice(-2);
                    const seqRes = await client.query("SELECT COUNT(*) FROM sales_returns WHERE return_number LIKE $1", [`SR-${yy}-%`]);
                    const retNumber = `SR-${yy}-${String(seqRes.rows[0].count + 1).padStart(4, '0')}`;

                    const srRes = await client.query(`
                        INSERT INTO sales_returns (
                            return_number, customer_id, invoice_id, return_date, 
                            type, grand_total, total_taxable, total_tax, status, created_by
                        ) SELECT $1, customer_id, $2, CURRENT_DATE, 'Sales Return', $3, $4, $5, 'Applied', $6
                          FROM sales_invoices WHERE id = $2
                        RETURNING id
                    `, [retNumber, ret.invoice_id, total, taxable, tax, verified_by]);

                    const srId = srRes.rows[0].id;

                    // D. Insert Return Line
                    await client.query(`
                        INSERT INTO sales_return_lines (
                            return_id, product_id, batch_id, qty, rate, tax_percent, tax_amount, amount, reason
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `, [srId, ret.product_id, ret.batch_id, ret.qty, rate, taxPct, tax, total, ret.reason]);

                    // E. Post GL Entries (Revenue Reversal)
                    const acc_ar = 1101;
                    const acc_revenue = 4001;
                    const acc_gst_cgst = 2011;
                    const acc_gst_sgst = 2012;

                    let glLines = [
                        { code: acc_revenue, debit: Number(taxable.toFixed(2)), credit: 0 },
                        { code: acc_ar, debit: 0, credit: Number(total.toFixed(2)) }
                    ];
                    if (tax > 0) {
                        glLines.push({ code: acc_gst_cgst, debit: Number((tax / 2).toFixed(2)), credit: 0 });
                        glLines.push({ code: acc_gst_sgst, debit: Number((tax - (tax / 2)).toFixed(2)), credit: 0 });
                    }
                    await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
                        [new Date(), `Trip Return Adjustment: ${retNumber}`, 'SALES_RET', srId, JSON.stringify(glLines)]);

                    // F. FINANCIAL ADJUSTMENT: Deduct from original invoice grand_total
                    await client.query(`
                        UPDATE sales_invoices 
                        SET grand_total = grand_total - $1,
                            status = CASE WHEN (grand_total - $1) <= amount_paid THEN 'Paid' ELSE status END
                        WHERE id = $2
                    `, [total, ret.invoice_id]);

                    // G. Update Stock
                    if (ret.batch_id) {
                        await client.query(`UPDATE inventory_batches SET quantity_remaining = quantity_remaining + $1 WHERE id = $2`, [ret.qty, ret.batch_id]);
                        await client.query(`INSERT INTO stock_traceability(batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes)
                            VALUES($1, $2, $3, 'IN', $4, 'Sales Return', $5)`, [ret.batch_id, ret.product_id, ret.qty, srId, 'Sales Return', `Return from Trip ${id}`]);
                    }
                }
            }
        }

        // 2. Process Pending Payments associated with this trip
        // Collect all payments collected during this trip
        const tripPayments = await client.query(`
            SELECT cp.id, cp.amount, cp.customer_id, cp.payment_mode, cp.payment_date 
            FROM customer_payments cp
            JOIN payment_allocations pa ON cp.id = pa.payment_id
            JOIN trip_invoices ti ON pa.invoice_id = ti.invoice_id
            WHERE ti.trip_id = $1 AND cp.verification_status = 'Pending'
        `, [id]);

        for (const pay of tripPayments.rows) {
            // A. Mark Verified
            await client.query(`UPDATE customer_payments SET verification_status = 'Verified', verified_by = $1, verified_at = NOW() WHERE id = $2`, [verified_by, pay.id]);

            // B. Impact Invoices via Allocations
            const allocs = await client.query(`SELECT * FROM payment_allocations WHERE payment_id = $1 AND status = 'PENDING'`, [pay.id]);
            for (const alloc of allocs.rows) {
                await client.query(`
                    UPDATE sales_invoices 
                    SET amount_paid = coalesce(amount_paid, 0) + $1,
                        status = CASE WHEN (coalesce(amount_paid, 0) + $1) >= grand_total THEN 'Paid' ELSE 'Partially Paid' END
                    WHERE id = $2
                `, [alloc.amount, alloc.invoice_id]);
                await client.query(`UPDATE payment_allocations SET status = 'ACTIVE' WHERE id = $1`, [alloc.id]);
            }

            // C. Post GL (AR vs Cash/Bank)
            const acc_ar = 1101;
            const acc_target = (pay.payment_mode === 'Cash') ? 1003 : 1002;
            const ledger = [
                { code: acc_target, debit: Number(pay.amount), credit: 0 },
                { code: acc_ar, debit: 0, credit: Number(pay.amount) }
            ];
            await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
                [pay.payment_date || new Date(), `Payment Verified: Trip ${id}`, 'CUST_PAY', pay.id, JSON.stringify(ledger)]);
        }

        // 3. Finalize Trip Status
        await client.query(`UPDATE delivery_trips SET status = 'Verified', updated_at = NOW() WHERE id = $1`, [id]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Trip verified and financial impacts applied.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Verification Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
