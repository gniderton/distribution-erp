const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { runBackgroundJob } = require('../utils/jobRunner');

// --- A. Dispatcher Operations ---

// 0. Mobile Login (Simple Phone + PIN Auth)
router.post('/login', async (req, res) => {
    const { phone, pin } = req.body;
    try {
        const result = await pool.query(`
            SELECT 
                e.id, e.full_name, e.contact_primary, d.title as designation, e.login_pin,
                dt.id as team_id, dt.name as team_name, dt.vehicle_id
            FROM employees e
            LEFT JOIN designations d ON e.designation_id = d.id
            LEFT JOIN delivery_teams dt ON e.id = dt.driver_id AND dt.is_active = true
            WHERE e.contact_primary = $1 AND e.employment_status = 'Active'
            LIMIT 1
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
            WHERE si.delivery_status IN ('Pending', 'Undelivered', 'Partial') -- Not Delivered yet
            ORDER BY rt.route_name, dse.full_name, c.route_sequence
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/vehicles', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, vehicle_number, vehicle_type FROM vehicles WHERE is_active = true');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/vehicles', async (req, res) => {
    try {
        const { vehicle_number, vehicle_type } = req.body;
        
        if (!vehicle_number) {
            return res.status(400).json({ error: "Vehicle number is required" });
        }

        const result = await pool.query(`
            INSERT INTO vehicles (vehicle_number, vehicle_type)
            VALUES ($1, $2)
            RETURNING *
        `, [vehicle_number, vehicle_type || null]);
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "A vehicle with this number already exists" });
        }
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

// 2.5 Create Delivery Team
router.post('/teams', async (req, res) => {
    try {
        const { name, driver_id, vehicle_id, helper_ids } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: "Team name is required" });
        }

        const result = await pool.query(`
            INSERT INTO delivery_teams (name, driver_id, vehicle_id, helper_ids)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [
            name, 
            driver_id || null, 
            vehicle_id || null, 
            helper_ids ? JSON.stringify(helper_ids) : null
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        // Handle unique constraint violation for name
        if (err.code === '23505') {
            return res.status(400).json({ error: "A team with this name already exists" });
        }
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

// 3a. Start Trip (Driver Action)
router.put('/trips/:id/start', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            UPDATE delivery_trips 
            SET status = 'In Transit', start_time = NOW() 
            WHERE id = $1 AND status = 'Scheduled'
            RETURNING id, trip_number
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Trip not found or already started/completed" });
        }

        res.json({ success: true, message: "Trip started", trip: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3b. Edit Trip (Manager Action - Only if Scheduled)
router.put('/trips/:id', async (req, res) => {
    const { id } = req.params;
    const { team_id, driver_id, vehicle_number, invoice_ids } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check if editable
        const statusRes = await client.query('SELECT status FROM delivery_trips WHERE id = $1', [id]);
        if (statusRes.rows.length === 0) throw new Error("Trip not found");
        if (statusRes.rows[0].status !== 'Scheduled') {
            throw new Error(`Trip is ${statusRes.rows[0].status} and cannot be edited`);
        }

        // 2. Update Header
        await client.query(`
            UPDATE delivery_trips 
            SET team_id = $1, driver_id = $2, vehicle_number = $3, updated_at = NOW()
            WHERE id = $4
        `, [team_id, driver_id, vehicle_number, id]);

        // 3. Sync Invoices (If provided)
        if (invoice_ids && Array.isArray(invoice_ids)) {
            // Get Current Invoices
            const currentInvoicesRes = await client.query('SELECT invoice_id FROM trip_invoices WHERE trip_id = $1', [id]);
            const currentInvoices = currentInvoicesRes.rows.map(r => String(r.invoice_id));
            const newInvoices = invoice_ids.map(id => String(id));

            // Identify Removed
            const removed = currentInvoices.filter(id => !newInvoices.includes(id));
            // Identify Added
            const added = newInvoices.filter(id => !currentInvoices.includes(id));

            // Process Removed
            for (const invId of removed) {
                await client.query('DELETE FROM trip_invoices WHERE trip_id = $1 AND invoice_id = $2', [id, invId]);
                await client.query("UPDATE sales_invoices SET delivery_status = 'Pending' WHERE id = $1", [invId]);
            }

            // Process Added
            for (const invId of added) {
                await client.query("INSERT INTO trip_invoices (trip_id, invoice_id, delivery_status) VALUES ($1, $2, 'Pending')", [id, invId]);
                await client.query("UPDATE sales_invoices SET delivery_status = 'In Transit' WHERE id = $1", [invId]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: "Trip updated successfully" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 3c. Delete/Abort Trip (Only if Scheduled)
router.delete('/trips/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verify it hasn't started
        const statusRes = await client.query('SELECT status FROM delivery_trips WHERE id = $1', [id]);
        if (statusRes.rows.length === 0) throw new Error("Trip not found");
        if (statusRes.rows[0].status !== 'Scheduled') {
            throw new Error(`Cannot delete a trip that is ${statusRes.rows[0].status}`);
        }

        // 2. Revert all invoices on this trip to 'Pending'
        await client.query(`
            UPDATE sales_invoices 
            SET delivery_status = 'Pending' 
            WHERE id IN (SELECT invoice_id FROM trip_invoices WHERE trip_id = $1)
        `, [id]);

        // 3. Clear junctions and delete master
        await client.query('DELETE FROM trip_invoices WHERE trip_id = $1', [id]);
        await client.query('DELETE FROM delivery_trips WHERE id = $1', [id]);

        await client.query('COMMIT');
        res.json({ success: true, message: "Trip deleted and invoices released" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});



// 4. Get Active Trips (List)
router.get('/trips', async (req, res) => {
    try {
        let statuses = ['Scheduled', 'In Transit'];
        if (req.query.status) {
            statuses = req.query.status.split(',');
        }
        const driverId = req.query.driver_id;

        let query = `
            SELECT 
                dt.id, dt.trip_number, dt.status, dt.created_at,
                dt.start_time, dt.end_time,
                dt.team_id, dt.driver_id,
                t.name as team_name, e.full_name as driver_name, dt.vehicle_number,
                COUNT(ti.id) as invoice_count
            FROM delivery_trips dt
            LEFT JOIN delivery_teams t ON dt.team_id = t.id
            LEFT JOIN employees e ON dt.driver_id = e.id
            LEFT JOIN trip_invoices ti ON dt.id = ti.trip_id
            WHERE dt.status = ANY($1)
        `;

        const params = [statuses];

        if (driverId) {
            query += ` AND dt.driver_id = $2`;
            params.push(driverId);
        }

        query += ` GROUP BY dt.id, dt.trip_number, dt.status, dt.created_at, dt.start_time, dt.end_time, dt.team_id, dt.driver_id, t.name, e.full_name, dt.vehicle_number
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
        const result = await pool.query(`
            SELECT 
                p.id as product_id, p.product_name, p.product_code, sil.mrp,
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

// 5b. Get Picklist (Web Dashboard - with Info)
router.get('/trips/:id/picklist-web', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.id as product_id, p.product_name, p.product_code, sil.mrp,
                SUM(sil.shipped_qty) as total_qty, string_agg(DISTINCT ib.batch_code, ', ') as batches
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN sales_invoice_lines sil ON si.id = sil.invoice_id
            JOIN products p ON sil.product_id = p.id
            LEFT JOIN inventory_batches ib ON sil.batch_id = ib.id
            WHERE ti.trip_id = $1
            GROUP BY p.id, p.product_name, p.product_code, sil.mrp
            ORDER BY p.product_name, sil.mrp
        `, [req.params.id]);

        const tripInfoRes = await pool.query(`
            SELECT 
                dt.id as trip_id, dt.trip_number, dt.created_at as "date", dt.vehicle_number,
                e.full_name as driver_name, t.name as team_name
            FROM delivery_trips dt
            LEFT JOIN employees e ON dt.driver_id = e.id
            LEFT JOIN delivery_teams t ON dt.team_id = t.id
            WHERE dt.id = $1
        `, [req.params.id]);

        res.json({ trip_info: tripInfoRes.rows[0] || {}, items: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
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
                ti.id as trip_invoice_id, si.id as invoice_id, si.sales_order_id, si.invoice_number, si.invoice_date, si.grand_total, si.balance_amount,
                c.id as customer_id, c.customer_name, 
                (SELECT address_line1 FROM customer_addresses WHERE customer_id = c.id LIMIT 1) as address,
                c.latitude, c.longitude, c.customer_phone as phone,
                ti.delivery_status, so.notes as instructions
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

// 6c. Get Invoice Delivery Cycle (Forensic History)
// "Who took it, when, and what happened?"
router.get('/invoices/:id/delivery-cycle', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch invoice details first to get customer name
        const invQuery = await pool.query(`
            SELECT si.id, si.invoice_number, c.customer_name 
            FROM sales_invoices si 
            JOIN customers c ON si.customer_id = c.id 
            WHERE si.id::text = $1 OR si.invoice_number = $1
        `, [id]);

        if (invQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        const invoiceDetails = invQuery.rows[0];

        const result = await pool.query(`
            SELECT 
                ti.delivery_status as attempt_status,
                ti.delivery_time as attempt_time,
                ti.failure_reason,
                ti.notes as attempt_notes,
                dt.trip_number,
                dt.status as trip_status,
                e.full_name as driver_name,
                dt.vehicle_number,
                dt.start_time as trip_start,
                dt.end_time as trip_end
            FROM trip_invoices ti
            JOIN delivery_trips dt ON ti.trip_id = dt.id
            LEFT JOIN employees e ON dt.driver_id = e.id
            WHERE ti.invoice_id = $1
            ORDER BY ti.id ASC -- Chronological order of attempts
        `, [invoiceDetails.id]);

        res.json({
            invoice_id: invoiceDetails.id,
            invoice_number: invoiceDetails.invoice_number,
            customer_name: invoiceDetails.customer_name,
            attempt_count: result.rows.length,
            timeline: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 6b. Get Manifest (Web Dashboard - with Info)
router.get('/trips/:id/manifest-web', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                ti.id as trip_invoice_id, si.id as invoice_id, si.sales_order_id, si.invoice_number, si.invoice_date, si.grand_total, si.balance_amount, si.eway_bill_number,
                c.id as customer_id, c.customer_name, 
                (SELECT address_line1 FROM customer_addresses WHERE customer_id = c.id LIMIT 1) as address,
                c.latitude, c.longitude, c.customer_phone as phone,
                ti.delivery_status, so.notes as instructions
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            LEFT JOIN sales_orders so ON si.sales_order_id = so.id
            WHERE ti.trip_id = $1
            ORDER BY c.route_sequence ASC
        `, [req.params.id]);

        const tripInfoRes = await pool.query(`
            SELECT dt.id as trip_id, dt.team_id, dt.trip_number, dt.created_at as "date", dt.vehicle_number,
                   e.full_name as driver_name, t.name as team_name
            FROM delivery_trips dt
            LEFT JOIN employees e ON dt.driver_id = e.id
            LEFT JOIN delivery_teams t ON dt.team_id = t.id
            WHERE dt.id = $1
        `, [req.params.id]);

        res.json({ trip_info: tripInfoRes.rows[0] || {}, items: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. Sync Delivery Data (End of Day / Live)
router.post('/sync', async (req, res) => {
    const client = await pool.connect();
    const { 
        trip_id, 
        updates, 
        payments, 
        returns, 
        expenses, 
        denominations,
        sync_source = 'MOBILE' // 🚀 NEW: Default to MOBILE, allows 'MANUAL_IMPORT'
    } = req.body;

    try {
        await client.query('BEGIN');

        // 1. Create Master Sync Log (The "Header")
        const summary = {
            updates_count: updates?.length || 0,
            payments_count: payments?.length || 0,
            returns_count: returns?.length || 0,
            expenses_count: expenses?.length || 0,
            has_denominations: !!denominations,
            sync_source: sync_source
        };

        const syncRes = await client.query(
            "INSERT INTO sync_logs (trip_id, payload_summary, sync_type) VALUES ($1, $2, 'Delivery') RETURNING id",
            [trip_id, JSON.stringify(summary)]
        );
        const syncId = syncRes.rows[0].id;
        console.log(`Master Sync ID Created: ${syncId} for Trip ${trip_id} (Source: ${sync_source})`);

        // --- 1.1 Create Unique Daily Sales Report per Sync event ---
        const tripRes = await client.query('SELECT driver_id FROM delivery_trips WHERE id = $1', [trip_id]);
        const driverId = tripRes.rows[0]?.driver_id;
        let reportId = null;

        if (driverId) {
            const dsrRes = await client.query(`
                INSERT INTO daily_sales_reports (dse_id, report_date, sync_id, settlement_status)
                VALUES ($1, CURRENT_DATE, $2, 'Pending')
                RETURNING id
            `, [driverId, syncId]);
            reportId = dsrRes.rows[0].id;
        }

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
                        verification_status = 'Pending',
                        failure_reason = $6
                    WHERE trip_id = $4 AND invoice_id = $5
                `, [update.status, update.timestamp, syncId, trip_id, update.invoice_id, update.reason || null]);

                // Update Master Invoice Table Status
                await client.query(`
                    UPDATE sales_invoices 
                    SET delivery_status = $1,
                        failure_reason = $3
                    WHERE id = $2
                `, [update.status, update.invoice_id, update.reason || null]);
            }
        }

        // 4. Process Payments
        if (payments && Array.isArray(payments)) {
            for (const p of payments) {
                // Idempotency Check (Duplicate sync prevention)
                if (p.offline_id) {
                    const existing = await client.query('SELECT id FROM customer_payments WHERE offline_id = $1', [p.offline_id]);
                    if (existing.rows.length > 0) {
                        console.log(`Payment ${p.offline_id} already exists. Skipping.`);
                        continue;
                    }
                }

                const yy = new Date().getFullYear().toString().slice(-2);
                const seqRes = await client.query("SELECT COUNT(*) FROM customer_payments WHERE payment_number LIKE $1", [`PAY-${yy}-%`]);
                const nextSeq = parseInt(seqRes.rows[0].count) + 1;
                const payNumber = `PAY-${yy}-${String(nextSeq).padStart(4, '0')}`;

                const payRes = await client.query(`
                    INSERT INTO customer_payments (
                        payment_number, customer_id, amount, payment_mode, transaction_ref, 
                        collected_by, payment_date, verification_status, status, sync_id, report_id, offline_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'Pending', 'Pending', $7, $8, $9)
                    RETURNING id
                `, [payNumber, p.customer_id, p.amount, p.mode, p.transaction_ref || p.bank_name, p.collected_by || driverId, syncId, reportId, p.offline_id || null]);

                const paymentId = payRes.rows[0].id;

                await client.query(`
                    INSERT INTO customer_payment_allocations (payment_id, invoice_id, amount, status)
                    VALUES ($1, $2, $3, 'PENDING')
                `, [paymentId, p.invoice_id, p.amount]);
            }
        }

        // 5. Process Returns (Dual Flow: Instant vs Expiry)
        if (returns && Array.isArray(returns)) {
            for (const r of returns) {
                // Idempotency Check
                if (r.offline_id) {
                    const existing = await client.query('SELECT id FROM trip_returns WHERE offline_id = $1', [r.offline_id]);
                    if (existing.rows.length > 0) {
                        console.log(`Return ${r.offline_id} already exists. Skipping.`);
                        continue;
                    }
                }

                const invId = (r.invoice_id && !isNaN(r.invoice_id)) ? r.invoice_id : null;
                const batchId = (r.batch_id && !isNaN(r.batch_id)) ? r.batch_id : null;
                const customerId = r.customer_id || null;

                await client.query(`
                    INSERT INTO trip_returns (
                        trip_id, invoice_id, product_id, customer_id, return_type, qty, reason, 
                        verification_status, batch_id, condition, sync_id, report_id, offline_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', $8, $9, $10, $11, $12)
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
                    syncId,
                    reportId,
                    r.offline_id || null
                ]);
            }
        }

        // 6. Process Expenses
        if (expenses && Array.isArray(expenses)) {
            for (const e of expenses) {
                await client.query(`
                    INSERT INTO dse_expenses (dse_id, expense_type, amount, description, status, sync_id, report_id, offline_id)
                    VALUES ($1, $2, $3, $4, 'Pending', $5, $6, $7)
                `, [e.collected_by || driverId, e.type || e.mode, e.amount, e.description || 'Trip Expense', syncId, reportId, e.id || e.offline_id || null]);
            }
        }

        // 7. Process Denominations
        if (denominations && denominations.total_verified > 0) {
            await client.query(`
                INSERT INTO cash_denominations (
                    dse_id, report_date, note_500, note_200, note_100, 
                    note_50, note_20, note_10, coins, total_amount, sync_id, report_id
                ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                denominations.dse_id || driverId,
                denominations.n500 || 0,
                denominations.n200 || 0,
                denominations.n100 || 0,
                denominations.n50 || 0,
                denominations.n20 || 0,
                denominations.n10 || 0,
                denominations.coins || 0,
                denominations.total_verified,
                syncId,
                reportId
            ]);
        }

        // 8. Update Daily Report Totals (For the Audit Hub consolidated view)
        if (reportId) {
            await client.query(`
                UPDATE daily_sales_reports SET
                    total_collection_cash = (SELECT COALESCE(SUM(amount),0) FROM customer_payments WHERE report_id = $1 AND payment_mode = 'Cash'),
                    total_collection_cheque = (SELECT COALESCE(SUM(amount),0) FROM customer_payments WHERE report_id = $1 AND payment_mode = 'Cheque'),
                    total_collection_online = (SELECT COALESCE(SUM(amount),0) FROM customer_payments WHERE report_id = $1 AND payment_mode NOT IN ('Cash','Cheque')),
                    total_expense = (SELECT COALESCE(SUM(amount),0) FROM dse_expenses WHERE report_id = $1),
                    submitted_at = NOW()
                WHERE id = $1
            `, [reportId]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: "Sync successful", sync_id: syncId, report_id: reportId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sync Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- D. Verification & Settlement Portal ---

// 10. List Sync Logs (Manager Dashboard)
router.get('/sync-logs', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                sl.id, sl.trip_id, sl.payload_summary, sl.sync_type, sl.status, sl.created_at,
                dt.trip_number, 
                e.full_name as driver_name,
                (SELECT COUNT(*) FROM trip_invoices WHERE sync_id = sl.id) as manifest_count,
                (SELECT COUNT(*) FROM trip_returns WHERE sync_id = sl.id) as return_count
            FROM sync_logs sl
            LEFT JOIN delivery_trips dt ON sl.trip_id::bigint = dt.id
            LEFT JOIN employees e ON dt.driver_id = e.id
            WHERE sl.status = 'Pending' AND sl.sync_type = 'Delivery'
            ORDER BY sl.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10a. List Checked Sync Logs (History)
router.get('/sync-logs/history', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                sl.id, sl.trip_id, sl.payload_summary, sl.sync_type, sl.status, sl.created_at,
                dt.trip_number, 
                e.full_name as driver_name,
                (SELECT COUNT(*) FROM trip_invoices WHERE sync_id = sl.id) as manifest_count,
                (SELECT COUNT(*) FROM trip_returns WHERE sync_id = sl.id) as return_count
            FROM sync_logs sl
            LEFT JOIN delivery_trips dt ON sl.trip_id::bigint = dt.id
            LEFT JOIN employees e ON dt.driver_id = e.id
            WHERE sl.status = 'Checked' AND sl.sync_type = 'Delivery'
            ORDER BY sl.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 11. Consolidated Sync Details (Verification View)
router.get('/sync/:id/details', async (req, res) => {
    try {
        const syncId = req.params.id;

        // A. Header
        const header = await pool.query("SELECT * FROM sync_logs WHERE id = $1", [syncId]);
        if (header.rows.length === 0) return res.status(404).json({ error: "Sync not found" });

        // B. Manifest (Deliveries)
        const manifest = await pool.query(`
            SELECT 
                ti.*, si.invoice_number, si.grand_total, si.customer_id, c.customer_name
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            WHERE ti.sync_id = $1
        `, [syncId]);

        // C. Returns
        const returns = await pool.query(`
            SELECT tr.*, p.product_name, si.invoice_number, c.customer_name
            FROM trip_returns tr
            JOIN products p ON tr.product_id = p.id
            JOIN customers c ON tr.customer_id = c.id
            LEFT JOIN sales_invoices si ON tr.invoice_id = si.id
            WHERE tr.sync_id = $1
        `, [syncId]);

        // D. Payments
        const payments = await pool.query(`
            SELECT cp.*, c.customer_name
            FROM customer_payments cp
            JOIN customers c ON cp.customer_id = c.id
            WHERE cp.sync_id = $1
        `, [syncId]);

        // E. Expenses
        const expenses = await pool.query(`
            SELECT * FROM dse_expenses WHERE sync_id = $1
        `, [syncId]);

        // Helpers for Product Aggregation
        const getSummary = async (list) => {
            if (!list || list.length === 0) return [];
            const ids = list.map(i => i.invoice_id);
            const res = await pool.query(`
                SELECT p.product_name, sil.mrp, SUM(sil.shipped_qty) as total_qty, SUM(sil.amount) as total_amount
                FROM sales_invoice_lines sil
                JOIN products p ON sil.product_id = p.id
                WHERE sil.invoice_id = ANY($1)
                GROUP BY p.product_name, sil.mrp
                ORDER BY p.product_name
            `, [ids]);
            return res.rows;
        };

        const getReturnSummary = (list) => {
            const groups = {};
            list.forEach(r => {
                const key = r.product_name;
                if (!groups[key]) groups[key] = { product_name: r.product_name, total_qty: 0 };
                groups[key].total_qty += Number(r.qty);
            });
            return Object.values(groups);
        };

        const allInvoices = manifest.rows;
        const rejected = allInvoices.filter(r => r.delivery_status === 'Returned' || r.verification_status === 'Rejected');
        const undelivered = allInvoices.filter(r => r.delivery_status !== 'Delivered' && r.delivery_status !== 'Returned');

        res.json({
            header: header.rows[0],
            manifest: allInvoices, // Back to the original flat list for approval
            returns: returns.rows,
            payments: payments.rows,
            expenses: expenses.rows,
            rejected_summary: await getSummary(rejected),
            undelivered_summary: await getSummary(undelivered),
            returns_summary: getReturnSummary(returns.rows)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 11.5 NEW: Sync History Details (Categorized for Settled Trips)
router.get('/sync/:id/history', async (req, res) => {
    try {
        const syncId = req.params.id;

        // A. Header
        const header = await pool.query("SELECT * FROM sync_logs WHERE id = $1", [syncId]);
        if (header.rows.length === 0) return res.status(404).json({ error: "Sync not found" });

        // B. All Invoices (Manifest)
        const manifest = await pool.query(`
            SELECT ti.*, si.invoice_number, si.grand_total, si.customer_id, c.customer_name
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            WHERE ti.sync_id = $1
        `, [syncId]);

        // C. Returns
        const returns = await pool.query(`
            SELECT tr.*, p.product_name, si.invoice_number, c.customer_name
            FROM trip_returns tr
            JOIN products p ON tr.product_id = p.id
            JOIN customers c ON tr.customer_id = c.id
            LEFT JOIN sales_invoices si ON tr.invoice_id = si.id
            WHERE tr.sync_id = $1
        `, [syncId]);

        // D. Payments
        const payments = await pool.query(`
            SELECT cp.*, c.customer_name
            FROM customer_payments cp
            JOIN customers c ON cp.customer_id = c.id
            WHERE cp.sync_id = $1
        `, [syncId]);

        // E. Expenses
        const expenses = await pool.query(`
            SELECT * FROM dse_expenses WHERE sync_id = $1
        `, [syncId]);

        // F. Linked Credit Notes (Sales Returns)
        const creditNotes = await pool.query(`
            SELECT sr.*, c.customer_name 
            FROM sales_returns sr
            JOIN customers c ON sr.customer_id = c.id
            WHERE sr.sync_id = $1
        `, [syncId]);

        const allInvoices = manifest.rows;
        
        const delivered = allInvoices.filter(r => r.delivery_status === 'Delivered' && r.verification_status === 'Approved');
        const rejected = allInvoices.filter(r => r.delivery_status === 'Returned' || r.verification_status === 'Rejected');
        const undelivered = allInvoices.filter(r => r.delivery_status !== 'Delivered' && r.delivery_status !== 'Returned');

        // Helper for Product Aggregation (Invoices)
        const getSummary = async (list) => {
            if (!list || list.length === 0) return [];
            const ids = list.map(i => i.invoice_id);
            const res = await pool.query(`
                SELECT p.product_name, sil.mrp, SUM(sil.shipped_qty) as total_qty, SUM(sil.amount) as total_amount
                FROM sales_invoice_lines sil
                JOIN products p ON sil.product_id = p.id
                WHERE sil.invoice_id = ANY($1)
                GROUP BY p.product_name, sil.mrp
                ORDER BY p.product_name
            `, [ids]);
            return res.rows;
        };

        // Helper for Product Aggregation (Returns)
        const getReturnSummary = (list) => {
            const groups = {};
            list.forEach(r => {
                const key = r.product_name;
                if (!groups[key]) groups[key] = { product_name: r.product_name, total_qty: 0 };
                groups[key].total_qty += Number(r.qty);
            });
            return Object.values(groups);
        };

        res.json({
            header: header.rows[0],
            delivered,
            delivered_summary: await getSummary(delivered),
            rejected,
            rejected_summary: await getSummary(rejected),
            undelivered,
            undelivered_summary: await getSummary(undelivered),
            returns: returns.rows,
            returns_summary: getReturnSummary(returns.rows),
            payments: payments.rows,
            expenses: expenses.rows,
            credit_notes: creditNotes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 12. Settlement & Verification Gate (The "Hammer" API)
router.post('/verify/settle', async (req, res) => {
    const { sync_id, manifest_verifications, return_verifications, verified_by } = req.body;
    // manifest_verifications: [{ invoice_id, status: 'Approved' | 'Rejected' | 'Undelivered' }]
    // return_verifications: [{ return_id, status: 'Approved' | 'Rejected' }]

    if (!sync_id || !verified_by) return res.status(400).json({ error: "sync_id and verified_by are required" });

    const jobId = await runBackgroundJob('verify-settle', async (updateProgress) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const totalItems = (manifest_verifications ? manifest_verifications.length : 0) + (return_verifications ? return_verifications.length : 0);
            let index = 0;

            // --- 1. Process Manifest Verifications ---
            if (manifest_verifications && Array.isArray(manifest_verifications)) {
                for (const v of manifest_verifications) {
                    if (totalItems > 0) updateProgress(Math.floor((index / totalItems) * 100));
                    index++;
                // A. Update Junction Status
                // Database constraint only allows: ['Pending', 'Approved', 'Rejected']
                let junctionStatus = (v.status === 'Approved') ? 'Approved' : 'Rejected';

                await client.query(`
                    UPDATE trip_invoices 
                    SET verification_status = $1, verified_by = $2, verified_at = NOW()
                    WHERE sync_id = $3 AND invoice_id = $4
                `, [junctionStatus, verified_by, sync_id, v.invoice_id]);

                // B. Handle Special Case: Undelivered (Time/Closed)
                if (v.status === 'Undelivered') {
                    await client.query(`UPDATE sales_invoices SET delivery_status = 'Pending' WHERE id = $1`, [v.invoice_id]);
                }

                // C. Handle Special Case: Rejected (Shop Rejected Invoice) -> Auto-Process as Return
                if (v.status === 'Rejected') {
                    const linesRes = await client.query(`
                        SELECT sil.product_id, sil.shipped_qty, sil.batch_id, si.customer_id
                        FROM sales_invoice_lines sil JOIN sales_invoices si ON sil.invoice_id = si.id
                        WHERE sil.invoice_id = $1
                    `, [v.invoice_id]);

                    for (const line of linesRes.rows) {
                        const checkRes = await client.query(`
                            SELECT id FROM trip_returns WHERE sync_id = $1 AND invoice_id = $2 AND product_id = $3
                        `, [sync_id, v.invoice_id, line.product_id]);

                        if (checkRes.rows.length === 0) {
                            await client.query(`
                                INSERT INTO trip_returns (
                                    trip_id, invoice_id, product_id, customer_id, return_type, qty, reason, 
                                    verification_status, batch_id, sync_id, verified_by, verified_at
                                ) VALUES ((SELECT trip_id::BIGINT FROM sync_logs WHERE id = $1), $2, $3, $4, 'Instant Rejection', $5, 'Manager Rejected Manifest', 'Approved', $6, $1, $7, NOW())
                            `, [sync_id, v.invoice_id, line.product_id, line.customer_id, line.shipped_qty, line.batch_id, verified_by]);
                        } else {
                            // If it exists but was pending, approve it
                            await client.query(`UPDATE trip_returns SET verification_status = 'Approved', verified_by = $1, verified_at = NOW() WHERE id = $2`, [verified_by, checkRes.rows[0].id]);
                        }
                    }
                }
            }
        }

        // --- 2. Process Return Verifications (Update status for manual entries) ---
        if (return_verifications && Array.isArray(return_verifications)) {
            for (const v of return_verifications) {
                await client.query(`
                    UPDATE trip_returns 
                    SET verification_status = $1, verified_by = $2, verified_at = NOW()
                    WHERE id = $3 AND sync_id = $4
                `, [v.status === 'Approved' ? 'Approved' : 'Rejected', verified_by, v.return_id, sync_id]);
            }
        }

        // --- 2.5 Update Sync Status & Trip Status ---
        await client.query(`UPDATE sync_logs SET status = 'Checked' WHERE id = $1`, [sync_id]);
        await client.query(`
            UPDATE delivery_trips 
            SET status = 'Verified', updated_at = NOW() 
            WHERE id = (SELECT trip_id::BIGINT FROM sync_logs WHERE id = $1)
        `, [sync_id]);

        // --- 3. CONSOLIDATED CREDIT NOTE GENERATION (Grouped by Customer) ---
        const approvedReturns = await client.query(`
            SELECT * FROM trip_returns 
            WHERE sync_id = $1 AND verification_status = 'Approved' AND sales_return_id IS NULL
        `, [sync_id]);

        const groupedByCustomer = {};
        for (const ret of approvedReturns.rows) {
            if (!groupedByCustomer[ret.customer_id]) groupedByCustomer[ret.customer_id] = [];
            groupedByCustomer[ret.customer_id].push(ret);
        }

        for (const customerId in groupedByCustomer) {
            const items = groupedByCustomer[customerId];
            
            // 3.1 Initialize Consolidated Totals
            let totalTaxable = 0;
            let totalTax = 0;
            let totalGrand = 0;
            const lineItems = [];

            // 3.2 Fetch Sequence Number (One per Customer)
            const seqUpdate = await client.query(`
                UPDATE document_sequences 
                SET current_number = current_number + 1 
                WHERE document_type = 'SR' 
                RETURNING prefix, current_number
            `);

            if (seqUpdate.rows.length === 0) {
                throw new Error("Document sequence for 'SR' (Sales Returns) is missing. Please seed the document_sequences table.");
            }

            const srNumber = `${seqUpdate.rows[0].prefix}${String(seqUpdate.rows[0].current_number).padStart(4, '0')}`;

            // 3.3 Preliminary Valuation for each item
            for (const ret of items) {
                const custInfo = await client.query(`SELECT price_column FROM channels c JOIN customers cust ON cust.channel_id = c.id WHERE cust.id = $1`, [ret.customer_id]);
                const defaultPriceCol = custInfo.rows[0]?.price_column || 'retail_rate';
                const brandOverride = await client.query(`SELECT ch.price_column FROM customer_brand_pricing cbp JOIN channels ch ON cbp.channel_id = ch.id JOIN products p ON p.brand_id = cbp.brand_id WHERE cbp.customer_id = $1 AND p.id = $2`, [ret.customer_id, ret.product_id]);
                const priceCol = brandOverride.rows[0]?.price_column || defaultPriceCol;

                // A. Target the specific Batch Rate (Net Realized Cost Fallback)
                let rateInfo = await client.query(`
                    SELECT b.${priceCol} as rate, t.tax_percentage, b.net_purchase_rate, b.purchase_rate
                    FROM inventory_batches b 
                    JOIN products p ON b.product_id = p.id 
                    LEFT JOIN taxes t ON p.tax_id = t.id 
                    WHERE b.id = $1
                `, [ret.batch_id]);
                
                if (!rateInfo.rows.length) {
                    rateInfo = await client.query(`
                        SELECT p.${priceCol} as rate, t.tax_percentage 
                        FROM products p 
                        LEFT JOIN taxes t ON p.tax_id = t.id 
                        WHERE p.id = $1
                    `, [ret.product_id]);
                }
                const baseRate = Number(rateInfo.rows[0]?.rate || 0);
                const taxPct = Number(rateInfo.rows[0]?.tax_percentage || 0);

                let netValuation = baseRate;
                if (ret.invoice_id) {
                    // Scenario 1: Direct link to a source invoice
                    const lineRes = await client.query(`SELECT (taxable_amount / NULLIF(shipped_qty, 0)) as unit_net FROM sales_invoice_lines WHERE invoice_id = $1 AND product_id = $2 LIMIT 1`, [ret.invoice_id, ret.product_id]);
                    if (lineRes.rows.length > 0) netValuation = Number(lineRes.rows[0].unit_net);
                } else if (ret.batch_id) {
                    // Scenario 2: Find the last time this customer bought THIS SPECIFIC batch to reverse correctly
                    const historicSale = await client.query(`
                        SELECT (sil.taxable_amount / NULLIF(sil.shipped_qty, 0)) as unit_net
                        FROM sales_invoice_lines sil
                        JOIN sales_invoices si ON si.id = sil.invoice_id
                        WHERE si.customer_id = $1 AND sil.batch_id = $2
                        ORDER BY si.invoice_date DESC, si.id DESC LIMIT 1
                    `, [ret.customer_id, ret.batch_id]);
                    if (historicSale.rows.length > 0) netValuation = Number(historicSale.rows[0].unit_net);
                }

                const qtyNum = Number(ret.qty);
                const unitScheme = Math.max(0, baseRate - netValuation);
                const grossAmount = Number((qtyNum * baseRate).toFixed(2));
                const schemeAmount = Number((qtyNum * unitScheme).toFixed(2));
                const taxableAmount = Number((grossAmount - schemeAmount).toFixed(2));
                const taxAmount = Number((taxableAmount * (taxPct / 100)).toFixed(2));
                const itemTotal = Number((taxableAmount + taxAmount).toFixed(2));

                lineItems.push({
                    ret,
                    baseRate,
                    grossAmount,
                    schemeAmount,
                    taxableAmount,
                    taxPct,
                    taxAmount,
                    itemTotal
                });

                totalTaxable = Number((totalTaxable + taxableAmount).toFixed(2));
                totalTax = Number((totalTax + taxAmount).toFixed(2));
                totalGrand = Number((totalGrand + itemTotal).toFixed(2));
            }

            const roundedGrandTotal = Math.round(totalGrand);
            const roundOff = Number((roundedGrandTotal - totalGrand).toFixed(2));
            const sourceInvoiceId = items[0]?.invoice_id || null;

            // 3.4 Create Consolidate Header
            const srRes = await client.query(`
                INSERT INTO sales_returns (return_number, customer_id, invoice_id, return_date, type, grand_total, total_taxable, total_tax, status, created_by, sync_id)
                VALUES ($1, $2, $3, CURRENT_DATE, 'Sales Return', $4, $5, $6, 'Applied', $7, $8) RETURNING id
            `, [srNumber, customerId, sourceInvoiceId, roundedGrandTotal, totalTaxable, totalTax, verified_by, sync_id]);
            const srId = srRes.rows[0].id;

            // 3.5 Create Lines and Process Stock
            for (const line of lineItems) {
                const { ret } = line;
                await client.query(`
                    INSERT INTO sales_return_lines (return_id, product_id, batch_id, qty, rate, gross_amount, scheme_amount, taxable_amount, tax_percent, tax_amount, amount, reason)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [srId, ret.product_id, ret.batch_id, ret.qty, line.baseRate, line.grossAmount, line.schemeAmount, line.taxableAmount, line.taxPct, line.taxAmount, Math.round(line.itemTotal), ret.reason]);

                await client.query(`UPDATE trip_returns SET sales_return_id = $1 WHERE id = $2`, [srId, ret.id]);

                // Stock Routing for each item
                if (ret.batch_id) {
                    let targetStatus = 'Good';
                    if (ret.return_type === 'Expiry/Damage Return') {
                        if (ret.reason?.match(/damage/i)) targetStatus = 'Damage';
                        else if (ret.reason?.match(/expir/i)) targetStatus = 'Expiry';
                        else if (ret.reason?.match(/good/i)) targetStatus = 'Good';
                    }
                    const orig = (await client.query("SELECT * FROM inventory_batches WHERE id = $1", [ret.batch_id])).rows[0];
                    let finalBatchId = ret.batch_id;
                    if (orig && orig.status !== targetStatus) {
                        const existing = await client.query("SELECT id FROM inventory_batches WHERE product_id = $1 AND batch_code = $2 AND status = $3", [orig.product_id, orig.batch_code, targetStatus]);
                        if (existing.rows.length) finalBatchId = existing.rows[0].id;
                        else {
                            const clone = await client.query(`
                                INSERT INTO inventory_batches (
                                    product_id, grn_id, batch_code, mrp, purchase_rate, net_purchase_rate, 
                                    distributor_rate, wholesale_rate, dealer_rate, retail_rate, 
                                    quantity_initial, quantity_remaining, expiry_date, is_active, status
                                )
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0, $11, true, $12) 
                                RETURNING id
                            `, [
                                orig.product_id, orig.grn_id, orig.batch_code, orig.mrp, 
                                orig.purchase_rate, orig.net_purchase_rate, orig.distributor_rate, 
                                orig.wholesale_rate, orig.dealer_rate, orig.retail_rate, 
                                orig.expiry_date, targetStatus
                            ]);
                            finalBatchId = clone.rows[0].id;
                        }
                    }
                    await client.query(`UPDATE inventory_batches SET quantity_remaining = quantity_remaining + $1 WHERE id = $2`, [ret.qty, finalBatchId]);
                    await client.query(`INSERT INTO stock_traceability(batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes) VALUES($1, $2, $3, 'IN', $4, 'Sales Return', $5)`,
                        [finalBatchId, ret.product_id, ret.qty, srId, `Return consolidated to ${targetStatus} basket`]);
                }
            }

            // 3.6 Post Consolidated Journal Entry
            const acc_inv = 1001, acc_ar = 1101, acc_sr = 4003, acc_cgst = 2011, acc_sgst = 2012, acc_cogs = 5001, acc_round = 5003;
            
            // Calculate Total Cost of Goods being returned to stock
            let totalReturnCost = 0;
            for (const line of lineItems) {
                if (line.ret.batch_id) {
                    const batchRes = await client.query("SELECT purchase_rate FROM inventory_batches WHERE id = $1", [line.ret.batch_id]);
                    if (batchRes.rows.length > 0) {
                        totalReturnCost += Number(line.ret.qty || 0) * Number(batchRes.rows[0].purchase_rate);
                    }
                }
            }
            totalReturnCost = Number(totalReturnCost.toFixed(2));

            // Ensure perfect balance: Returns + Tax + Rounding = AR
            const balancingReturns = Number((roundedGrandTotal - totalTax - roundOff).toFixed(2));
            const ledgerLines = [
                { code: acc_sr, debit: balancingReturns, credit: 0 },
                { code: acc_ar, debit: 0, credit: Number(roundedGrandTotal) }
            ];

            // [NEW] Inventory Reversal (Stock Restoration)
            if (totalReturnCost > 0) {
                ledgerLines.push({ code: acc_inv, debit: totalReturnCost, credit: 0 });
                ledgerLines.push({ code: acc_cogs, debit: 0, credit: totalReturnCost });
            }

            if (totalTax > 0) {
                const halfTax = Number((totalTax / 2).toFixed(2));
                const otherHalf = Number((totalTax - halfTax).toFixed(2));
                ledgerLines.push({ code: acc_cgst, debit: halfTax, credit: 0 });
                ledgerLines.push({ code: acc_sgst, debit: otherHalf, credit: 0 });
            }

            if (roundOff !== 0) {
                if (roundOff > 0) {
                    ledgerLines.push({ code: acc_round, debit: Math.abs(roundOff), credit: 0 });
                } else {
                    ledgerLines.push({ code: acc_round, debit: 0, credit: Math.abs(roundOff) });
                }
            }

            await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
                [new Date(), `Grouped Sales Return: ${srNumber}`, 'SALES_RETURN', srId, JSON.stringify(ledgerLines)]);

            // 3.7 Prioritized Credit Application (Today's Bill First, then LIFO)
            let creditRemaining = roundedGrandTotal;

            // LAYER 1: Link directly to invoices mentioned in the returns data
            const specificInvoices = [...new Set(items.map(i => i.invoice_id).filter(id => id))];
            for (const invId of specificInvoices) {
                if (creditRemaining <= 0.49) break;
                const invRes = await client.query(`
                    SELECT (grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id), 0)) as balance 
                    FROM sales_invoices WHERE id = $1
                `, [invId]);
                if (invRes.rows.length > 0) {
                    const balance = Number(invRes.rows[0].balance);
                    const apply = Math.min(creditRemaining, balance);
                    if (apply > 0) {
                        await client.query(`UPDATE sales_invoices SET amount_paid = COALESCE(amount_paid, 0) + $1, status = CASE WHEN (COALESCE(amount_paid, 0) + $1) >= (grand_total - 0.01) THEN 'Paid' ELSE 'Partially Paid' END WHERE id = $2`, [apply, invId]);
                        
                        // [NEW] Add Allocation Record for Audit Trail
                        await client.query(`
                            INSERT INTO customer_payment_allocations (invoice_id, amount, allocated_at, return_id, status)
                            VALUES ($1, $2, NOW(), $3, 'ACTIVE')
                        `, [invId, apply, srId]);

                        creditRemaining -= apply;
                    }
                }
            }

            // LAYER 2: Target invoices on the CURRENT TRIP for this customer
            if (creditRemaining > 0.49) {
                const tripInvoices = await client.query(`
                    SELECT si.id, (si.grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id), 0)) as balance
                    FROM sales_invoices si
                    JOIN trip_invoices ti ON ti.invoice_id = si.id
                    JOIN sync_logs sl ON sl.trip_id = ti.trip_id
                    WHERE sl.id = $1 AND si.customer_id = $2 AND si.status != 'Paid'
                    ORDER BY si.invoice_date DESC, si.id DESC
                `, [sync_id, customerId]);

                for (const inv of tripInvoices.rows) {
                    if (creditRemaining <= 0.49) break;
                    const balance = Number(inv.balance);
                    const apply = Math.min(creditRemaining, balance);
                    if (apply > 0) {
                        await client.query(`UPDATE sales_invoices SET amount_paid = COALESCE(amount_paid, 0) + $1, status = CASE WHEN (COALESCE(amount_paid, 0) + $1) >= (grand_total - 0.01) THEN 'Paid' ELSE 'Partially Paid' END WHERE id = $2`, [apply, inv.id]);
                        
                        // [NEW] Add Allocation Record for Audit Trail
                        await client.query(`
                            INSERT INTO customer_payment_allocations (invoice_id, amount, allocated_at, return_id, status)
                            VALUES ($1, $2, NOW(), $3, 'ACTIVE')
                        `, [inv.id, apply, srId]);

                        creditRemaining -= apply;
                    }
                }
            }

            // LAYER 3: Standard LIFO (Newest First) for any other unpaid invoices
            if (creditRemaining > 0.49) {
                const otherInvoices = await client.query(`
                    SELECT id, (grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id), 0)) as balance 
                    FROM sales_invoices 
                    WHERE customer_id = $1 AND status != 'Paid'
                    ORDER BY invoice_date DESC, id DESC
                `, [customerId]);
                
                for (const inv of otherInvoices.rows) {
                    if (creditRemaining <= 0.49) break;
                    const balance = Number(inv.balance);
                    const apply = Math.min(creditRemaining, balance);
                    if (apply > 0) {
                        await client.query(`UPDATE sales_invoices SET amount_paid = COALESCE(amount_paid, 0) + $1, status = CASE WHEN (COALESCE(amount_paid, 0) + $1) >= (grand_total - 0.01) THEN 'Paid' ELSE 'Partially Paid' END WHERE id = $2`, [apply, inv.id]);
                        
                        // [NEW] Add Allocation Record for Audit Trail
                        await client.query(`
                            INSERT INTO customer_payment_allocations (invoice_id, amount, allocated_at, return_id, status)
                            VALUES ($1, $2, NOW(), $3, 'ACTIVE')
                        `, [inv.id, apply, srId]);

                        creditRemaining -= apply;
                    }
                }
            }

            // [NEW] Convert remaining unutilized credit note amount to a Customer Advance
            if (creditRemaining > 0.01) {
                await client.query(`
                    INSERT INTO customer_advances (customer_id, return_id, amount, balance)
                    VALUES ($1, $2, $3, $3)
                `, [customerId, srId, creditRemaining]);
            }
        }

        await client.query('COMMIT');
        return "Settlement applied successfully";

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Settlement Error:', err);
        throw err;
    } finally {
        client.release();
    }
    });

    res.json({ jobId });
});

// 13. Verify Payments in Bulk (Bridge to existing Payment Verification system)
router.post('/verify-payments', async (req, res) => {
    const { payment_ids, verified_by } = req.body;
    if (!payment_ids || !Array.isArray(payment_ids)) return res.status(400).json({ error: "payment_ids array required" });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const pid of payment_ids) {
            // A. Mark Verified
            const payRes = await client.query(`
                UPDATE customer_payments 
                SET verification_status = 'Verified', verified_by = $1, verified_at = NOW() 
                WHERE id = $2 AND verification_status = 'Pending'
                RETURNING *
            `, [verified_by, pid]);

            if (payRes.rows.length > 0) {
                const pay = payRes.rows[0];
                // B. Activate Allocations
                const allocs = await client.query(`SELECT * FROM payment_allocations WHERE payment_id = $1 AND status = 'PENDING'`, [pid]);
                for (const alloc of allocs.rows) {
                    await client.query(`
                        UPDATE sales_invoices 
                        SET amount_paid = coalesce(amount_paid, 0) + $1,
                            status = CASE WHEN (coalesce(amount_paid, 0) + $1) >= grand_total THEN 'Paid' ELSE 'Partially Paid' END
                        WHERE id = $2
                    `, [alloc.amount, alloc.invoice_id]);
                    await client.query(`UPDATE payment_allocations SET status = 'ACTIVE' WHERE id = $1`, [alloc.id]);
                }

                // C. Accounting (Cash/Bank vs AR)
                const acc_ar = 1101;
                const acc_target = (pay.payment_mode === 'Cash') ? 1003 : 1002;
                const ledger = [
                    { code: acc_target, debit: Number(pay.amount), credit: 0 },
                    { code: acc_ar, debit: 0, credit: Number(pay.amount) }
                ];
                await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
                    [pay.payment_date || new Date(), `Settlement Payment Verified: ${pay.payment_number || pay.id}`, 'CUST_PAY', pay.id, JSON.stringify(ledger)]);
            }
        }
        await client.query('COMMIT');
        res.json({ success: true, message: "Payments verified and applied." });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 14. Finalize Trip (Closing the Loop)
router.post('/finalize', async (req, res) => {
    const { trip_id } = req.body;
    if (!trip_id) return res.status(400).json({ error: "trip_id required" });

    try {
        // Validation: Ensure no pending items in this trip across all syncs
        const pendingCheck = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM trip_invoices WHERE trip_id = $1 AND verification_status = 'Pending') as pending_invoices,
                (SELECT COUNT(*) FROM trip_returns WHERE trip_id = $1 AND verification_status = 'Pending') as pending_returns,
                (SELECT COUNT(*) FROM customer_payments cp JOIN sync_logs sl ON cp.sync_id = sl.id WHERE sl.trip_id::bigint = $1 AND cp.verification_status = 'Pending') as pending_payments
        `, [trip_id]);

        const counts = pendingCheck.rows[0];
        if (Number(counts.pending_invoices) > 0 || Number(counts.pending_returns) > 0 || Number(counts.pending_payments) > 0) {
            return res.status(400).json({
                error: "Cannot finalize trip. There are pending verifications.",
                details: counts
            });
        }

        await pool.query(`UPDATE delivery_trips SET status = 'Verified', updated_at = NOW() WHERE id = $1`, [trip_id]);
        res.json({ success: true, message: "Trip finalized and completed." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- C. Warehouse Operations ---

/**
 * @route   POST /api/delivery/mark-self-collected
 * @desc    Finalize a warehouse pickup for an invoice (Direct Collection)
 * @rules   Blocked if Invoice is 'In Transit' or 'Scheduled' for a trip.
 */
router.post('/mark-self-collected', async (req, res) => {
    const { 
        invoice_id, collector_name, collector_phone, 
        collector_id_type, collector_id_number, collector_document_name,
        created_by, notes 
    } = req.body;

    if (!invoice_id || !collector_name || !collector_phone || !collector_id_number) {
        return res.status(400).json({ error: "Missing required collector details" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch Invoice and Check Current Status
        const invRes = await client.query(`
            SELECT id, invoice_number, delivery_status 
            FROM sales_invoices 
            WHERE id = $1 FOR UPDATE
        `, [invoice_id]);

        if (invRes.rows.length === 0) {
            throw new Error('Invoice not found');
        }

        const inv = invRes.rows[0];

        // 2. APPLY STRICT OPERATIONAL RULES
        // Rule: Only 'Pending' or 'Undelivered' can be self-collected.
        // Block: 'In Transit', 'Scheduled', 'Delivered'.
        if (inv.delivery_status !== 'Pending' && inv.delivery_status !== 'Undelivered') {
            throw new Error(`Cannot self-collect. Invoice is currently '${inv.delivery_status}'. Collections are only allowed for 'Pending' or 'Undelivered' bills.`);
        }

        // 3. SECURE CHECK: Ensure it's not currently assigned to an Active/Scheduled Trip
        const tripCheck = await client.query(`
            SELECT ti.id, dt.trip_number, dt.status as trip_status
            FROM trip_invoices ti
            JOIN delivery_trips dt ON ti.trip_id = dt.id
            WHERE ti.invoice_id = $1 AND dt.status IN ('Scheduled', 'In Transit')
        `, [invoice_id]);

        if (tripCheck.rows.length > 0) {
            const trip = tripCheck.rows[0];
            throw new Error(`Invoice is already assigned to active Trip ${trip.trip_number} (${trip.trip_status}). Remove it from the trip first to proceed with Warehouse Collection.`);
        }

        // 4. Update Invoice Status
        await client.query(`
            UPDATE sales_invoices 
            SET delivery_status = 'Self-Collected'
            WHERE id = $1
        `, [invoice_id]);

        // 5. Create Permanent Collection Record
        await client.query(`
            INSERT INTO warehouse_collections (
                invoice_id, collector_name, collector_phone, 
                collector_id_type, collector_id_number, collector_document_name,
                created_by, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            invoice_id, collector_name, collector_phone, 
            collector_id_type, collector_id_number, collector_document_name,
            created_by, notes
        ]);

        await client.query('COMMIT');
        res.json({ success: true, message: "Invoice marked as Self-Collected at Warehouse." });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Self-Collect Error:', err.message);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
