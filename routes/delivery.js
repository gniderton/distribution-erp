const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- VEHICLE MASTER ---

router.get('/vehicles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vehicles WHERE is_active = true ORDER BY vehicle_number');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/vehicles', async (req, res) => {
    try {
        const { vehicle_number, vehicle_type } = req.body;
        const result = await pool.query(
            'INSERT INTO vehicles (vehicle_number, vehicle_type) VALUES ($1, $2) RETURNING *',
            [vehicle_number, vehicle_type]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TRIP MANAGEMENT ---

// POST /api/delivery/trips - Create Trip & Assign Invoices
router.post('/trips', async (req, res) => {
    const client = await pool.connect();
    try {
        const { vehicle_id, driver_id, helper_id, trip_date, invoice_ids } = req.body;
        if (!invoice_ids || !Array.isArray(invoice_ids)) return res.status(400).json({ error: 'No invoices selected' });

        await client.query('BEGIN');

        // 1. Generate Trip Number (TRP-YY-SEQ)
        const yy = new Date().getFullYear().toString().slice(-2);
        const seqRes = await client.query("SELECT COUNT(*) FROM delivery_trips WHERE trip_number LIKE $1", [`TRP-${yy}-%`]);
        const nextSeq = parseInt(seqRes.rows[0].count) + 1;
        const tripNumber = `TRP-${yy}-${String(nextSeq).padStart(4, '0')}`;

        // 2. Create Header
        const headRes = await client.query(`
            INSERT INTO delivery_trips (trip_number, trip_date, vehicle_id, driver_id, helper_id, status)
            VALUES ($1, $2, $3, $4, $5, 'Planned')
            RETURNING id
        `, [tripNumber, trip_date || new Date(), vehicle_id, driver_id, helper_id]);
        const tripId = headRes.rows[0].id;

        // 3. Create Stops
        for (let i = 0; i < invoice_ids.length; i++) {
            await client.query(`
                INSERT INTO trip_stops (trip_id, invoice_id, sequence_no, status)
                VALUES ($1, $2, $3, 'Pending')
            `, [tripId, invoice_ids[i], i + 1]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, trip_number: tripNumber, id: tripId });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// GET /api/delivery/trips/:id/manifest - Get All Details + Pick List
router.get('/trips/:id/manifest', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get Trip Header
        const tripRes = await pool.query(`
            SELECT dt.*, v.vehicle_number, v.vehicle_type, e.full_name as driver_name
            FROM delivery_trips dt
            LEFT JOIN vehicles v ON dt.vehicle_id = v.id
            LEFT JOIN employees e ON dt.driver_id = e.id
            WHERE dt.id = $1
        `, [id]);

        if (tripRes.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });

        // 2. Get Stops
        const stopsRes = await pool.query(`
            SELECT ts.*, si.invoice_number, c.customer_name, c.customer_phone, sa.address_line1, sa.city
            FROM trip_stops ts
            JOIN sales_invoices si ON ts.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            LEFT JOIN customer_addresses sa ON c.id = sa.customer_id AND sa.is_default = true
            WHERE ts.trip_id = $1
            ORDER BY ts.sequence_no
        `, [id]);

        // 3. Aggregate Pick List (Sum of all products in all invoices in this trip)
        const pickListRes = await pool.query(`
            SELECT p.product_name, p.product_code, SUM(sol.ordered_qty) as total_qty
            FROM trip_stops ts
            JOIN sales_invoices si ON ts.invoice_id = si.id
            JOIN sales_order_lines sol ON si.sales_order_id = sol.sales_order_id
            JOIN products p ON sol.product_id = p.id
            WHERE ts.trip_id = $1
            GROUP BY p.product_name, p.product_code
            ORDER BY p.product_name
        `, [id]);

        res.json({
            trip: tripRes.rows[0],
            stops: stopsRes.rows,
            pick_list: pickListRes.rows
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/delivery/stops/:id/status - Confirm Delivery (Driver)
router.post('/stops/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, delivery_lat, delivery_lng, rejection_reason } = req.body;

        const result = await pool.query(`
            UPDATE trip_stops 
            SET status = $1, delivery_lat = $2, delivery_lng = $3, rejection_reason = $4, delivered_at = NOW()
            WHERE id = $5
            RETURNING *
        `, [status, delivery_lat, delivery_lng, rejection_reason, id]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Stop not found' });

        res.json({ success: true, stop: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/delivery/trips/:id/print-pack - Full Aggregated Data for One-Click Print
router.get('/trips/:id/print-pack', async (req, res) => {
    try {
        const { id } = req.params;
        const { cutoff_amount = 5000 } = req.query; // Configurable threshold

        // 1. Header
        const tripRes = await pool.query(`
            SELECT dt.*, v.vehicle_number, e.full_name as driver_name
            FROM delivery_trips dt
            LEFT JOIN vehicles v ON dt.vehicle_id = v.id
            LEFT JOIN employees e ON dt.driver_id = e.id
            WHERE dt.id = $1
        `, [id]);
        if (tripRes.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });

        // 2. Pick List (From Invoice Lines, NOT Order Lines, to be accurate to actual stock out)
        const pickListRes = await pool.query(`
            SELECT p.product_name, p.product_code, SUM(sil.shipped_qty) as total_qty
            FROM trip_stops ts
            JOIN sales_invoices si ON ts.invoice_id = si.id
            JOIN sales_invoice_lines sil ON si.id = sil.invoice_id
            JOIN products p ON sil.product_id = p.id
            WHERE ts.trip_id = $1
            GROUP BY p.product_name, p.product_code
            ORDER BY p.product_name
        `, [id]);

        // 3. Delivery List (Stops)
        const stopsRes = await pool.query(`
            SELECT 
                ts.sequence_no, 
                si.invoice_number, si.grand_total,
                c.customer_name, c.address_line1, c.phone
            FROM trip_stops ts
            JOIN sales_invoices si ON ts.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            WHERE ts.trip_id = $1
            ORDER BY ts.sequence_no
        `, [id]);

        // 4. Invoices (The Heavy Payload)
        // Fetch All Invoices + Their Lines
        const invoicesRes = await pool.query(`
            SELECT 
                si.*, 
                c.customer_name, c.address_line1, c.gst as customer_gst,
                (SELECT json_agg(json_build_object(
                    'product_name', p.product_name,
                    'qty', sil.shipped_qty,
                    'rate', sil.rate,
                    'total', sil.amount,
                    'scheme', sol.tier_applied 
                ) ORDER BY sil.id)
                FROM sales_invoice_lines sil
                JOIN products p ON sil.product_id = p.id
                JOIN sales_orders so ON si.sales_order_id = so.id
                JOIN sales_order_lines sol ON so.id = sol.sales_order_id AND sol.product_id = sil.product_id
                WHERE sil.invoice_id = si.id
                ) as lines
            FROM trip_stops ts
            JOIN sales_invoices si ON ts.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            WHERE ts.trip_id = $1
            ORDER BY ts.sequence_no
        `, [id]);

        // 5. Logic: Determine Copies
        const invoices = invoicesRes.rows.map(inv => ({
            ...inv,
            print_copies: Number(inv.grand_total) < Number(cutoff_amount) ? 1 : 2
        }));

        res.json({
            trip: tripRes.rows[0],
            pick_list: pickListRes.rows,
            delivery_list: stopsRes.rows,
            invoices: invoices
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
