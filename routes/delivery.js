const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- A. Dispatcher Operations ---

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
            SELECT dt.id, dt.name, e.full_name as driver_name, v.vehicle_number 
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

        const result = await pool.query(`
            SELECT 
                dt.id, dt.trip_number, dt.status, dt.created_at,
                t.name as team_name, e.full_name as driver_name, dt.vehicle_number,
                COUNT(ti.id) as invoice_count
            FROM delivery_trips dt
            LEFT JOIN delivery_teams t ON dt.team_id = t.id
            LEFT JOIN employees e ON dt.driver_id = e.id
            LEFT JOIN trip_invoices ti ON dt.id = ti.trip_id
            WHERE dt.status = ANY($1)
            GROUP BY dt.id, dt.trip_number, dt.status, dt.created_at, t.name, e.full_name, dt.vehicle_number
            ORDER BY dt.created_at DESC
        `, [statusFilter]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- B. Warehouse Operations ---

// 5. Get Picklist (Aggregated)
router.get('/trips/:id/picklist', async (req, res) => {
    try {
        // Aggregate Qty by Product across all invoices in trip
        const result = await pool.query(`
            SELECT 
                p.product_name, p.product_code,
                SUM(sil.shipped_qty) as total_qty,
                string_agg(DISTINCT ib.batch_code, ', ') as batches
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN sales_invoice_lines sil ON si.id = sil.invoice_id
            JOIN products p ON sil.product_id = p.id
            LEFT JOIN inventory_batches ib ON sil.batch_id = ib.id
            WHERE ti.trip_id = $1
            GROUP BY p.id, p.product_name, p.product_code
            ORDER BY p.product_name
        `, [req.params.id]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- C. Mobile App Operations ---

// 6. Get Manifest (Detailed Route)
// Sorted by efficient route (or sequence)
router.get('/trips/:id/manifest', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                ti.id as trip_invoice_id,
                si.id as invoice_id, si.invoice_number, si.grand_total, si.balance_amount,
                c.customer_name, 
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
    const { trip_id, updates } = req.body;
    // updates: [{ invoice_id, status, payment: {}, returns: [] }]

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const update of updates) {
            // 1. Update Trip Invoice Status
            await client.query(`
                UPDATE trip_invoices 
                SET delivery_status = $1, delivery_time = NOW(), notes = $2
                WHERE trip_id = $3 AND invoice_id = $4
            `, [update.status, update.notes || null, trip_id, update.invoice_id]);

            // 2. Update Main Invoice Status
            // Logic: If Delivered -> Delivered. If Returned -> Returned. 
            // If Partial -> Partial. Undelivered -> Pending (for next trip)
            let mainStatus = update.status;
            if (update.status === 'Undelivered') mainStatus = 'Pending'; // Return to pool

            await client.query(`
                UPDATE sales_invoices SET delivery_status = $1 WHERE id = $2
            `, [mainStatus, update.invoice_id]);

            // 3. Handle Returns (Instant Rejections / Expiry)
            if (update.returns && update.returns.length > 0) {
                for (const ret of update.returns) {
                    await client.query(`
                        INSERT INTO trip_returns (trip_id, invoice_id, product_id, qty, reason, return_type, verification_status)
                        VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
                    `, [trip_id, update.invoice_id, ret.product_id, ret.qty, ret.reason, ret.type]);
                }
            }

            // 4. Handle Payments (Simple Collection)
            if (update.payment && update.payment.amount > 0) {
                // Call existing payment logic or insert directly? 
                // Better to insert into customer_payments directly
                await client.query(`
                    INSERT INTO customer_payments (
                        payment_number, customer_id, payment_date, amount, payment_mode, 
                        collected_by, verification_status, created_at
                    )
                    SELECT 
                        'PAY-DEL-' || $1 || '-' || $2, customer_id, CURRENT_DATE, $3, $4, 
                        (SELECT driver_id FROM delivery_trips WHERE id = $1), 'Pending', NOW()
                    FROM sales_invoices WHERE id = $2
                `, [trip_id, update.invoice_id, update.payment.amount, update.payment.mode]);
            }
        }

        // Check if trip is fully complete? (Optional, maybe specific endpoint for Trip End)

        await client.query('COMMIT');
        res.json({ success: true, message: 'Sync successful' });

    } catch (err) {
        await client.query('ROLLBACK');
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
            JOIN sales_invoices si ON tr.invoice_id = si.id
            WHERE tr.trip_id = $1
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. Verify Trip & Returns
router.post('/trips/:id/verify', async (req, res) => {
    const { return_actions, verified_by } = req.body;
    // return_actions: [{ return_id, action: 'Approve' | 'Reject', destination: 'Stock' | 'Scrap' }]

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const action of return_actions) {
            await client.query(`
                UPDATE trip_returns 
                SET verification_status = $1, verified_by = $2, verified_at = NOW()
                WHERE id = $3
            `, [action.action === 'Approve' ? 'Approved' : 'Rejected', verified_by, action.return_id]);

            // If Approved, what updates? 
            // - Credit Note creation? (Deferred as per user request)
            // - Stock Adjustment? (Move to Damaged/Scrap bucket)

            // For this phase, we just mark verification.
        }

        // Close Trip
        await client.query(`UPDATE delivery_trips SET status = 'Verified' WHERE id = $1`, [req.params.id]);

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
