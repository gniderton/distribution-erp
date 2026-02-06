const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/customers - List Customers (Searchable)
router.get('/', async (req, res) => {
    try {
        const { search, route_id, dse_id, limit = 2000, offset = 0 } = req.query; // Default limit 2000

        let query = `
            SELECT 
                c.*, 
                r.route_name,
                e.full_name as dse_name,
                ch.channel_name,
                ch.price_column as default_price_col,
                c.whatsapp_number, -- [NEW]
                rt.frequency_name as route_frequency, -- [NEW]
                (SELECT COUNT(*) FROM customer_addresses ca WHERE ca.customer_id = c.id) as address_count,
                 -- [NEW] Pricing Exceptions (Brand -> Channel -> Price Column)
                (
                    SELECT json_agg(json_build_object(
                        'brand_id', cbp.brand_id, 
                        'price_column', ch_ex.price_column,
                        'channel_name', ch_ex.channel_name
                    ))
                    FROM customer_brand_pricing cbp
                    JOIN channels ch_ex ON cbp.channel_id = ch_ex.id
                    WHERE cbp.customer_id = c.id
                ) as pricing_ex
            FROM customers c
            LEFT JOIN routes r ON c.route_id = r.id
            LEFT JOIN route_types rt ON c.route_type_id = rt.id
            LEFT JOIN employees e ON c.dse_id = e.id
            LEFT JOIN channels ch ON c.channel_id = ch.id
            WHERE c.is_active = true
        `;

        const params = [];
        let pIdx = 1;

        if (search) {
            query += ` AND (c.customer_name ILIKE $${pIdx} OR c.customer_phone ILIKE $${pIdx} OR c.email ILIKE $${pIdx})`;
            params.push(`%${search}%`);
            pIdx++;
        }

        if (route_id) {
            query += ` AND c.route_id = $${pIdx}`;
            params.push(route_id);
            pIdx++;
        }

        if (dse_id && dse_id !== 'null') {
            query += ` AND c.dse_id = $${pIdx}`;
            params.push(dse_id);
            pIdx++;
        }

        // [NEW] Filter by Service Day (Auto-Route)
        if (req.query.day) {
            const day = req.query.day; // e.g., 'Monday'
            query += ` AND (r.service_day = $${pIdx} OR r.route_name ILIKE $${pIdx + 1})`;
            params.push(day, `%${day}%`);
            pIdx += 2;
        }

        query += ` ORDER BY c.customer_name ASC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/customers/:id - Single Customer with Profile 360
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const client = await pool.connect();
        try {
            // 1. Basic Info
            const custRes = await client.query(`
                SELECT c.*, r.route_name, e.full_name as dse_name, ch.channel_name, ch.price_column
                FROM customers c
                LEFT JOIN routes r ON c.route_id = r.id
                LEFT JOIN employees e ON c.dse_id = e.id
                LEFT JOIN channels ch ON c.channel_id = ch.id
                WHERE c.id = $1
            `, [id]);

            if (custRes.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

            // 2. Addresses
            const addrRes = await client.query(`
                SELECT * FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default_billing DESC
            `, [id]);

            // 3. Brand Pricing Exceptions
            const priceRes = await client.query(`
                SELECT cbp.*, b.brand_name, ch.channel_name as override_channel
                FROM customer_brand_pricing cbp
                JOIN brands b ON cbp.brand_id = b.id
                JOIN channels ch ON cbp.channel_id = ch.id
                WHERE cbp.customer_id = $1
            `, [id]);

            res.json({
                ...custRes.rows[0],
                addresses: addrRes.rows,
                pricing_overrides: priceRes.rows
            });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/customers/:id/pending-bills - Get Unpaid Invoices
router.get('/:id/pending-bills', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                si.id, 
                si.invoice_number, 
                si.invoice_date, 
                si.grand_total, 
                (COALESCE(si.paid_amount, 0) + COALESCE(si.amount_paid, 0)) as amount_paid,
                (si.grand_total - COALESCE(si.paid_amount, 0) - COALESCE(si.amount_paid, 0)) as balance_amount,
                si.status,
                c.customer_name
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            WHERE si.customer_id = $1 
              AND si.status != 'Cancelled'
              AND (si.grand_total - COALESCE(si.paid_amount, 0) - COALESCE(si.amount_paid, 0)) > 0
            ORDER BY si.invoice_date ASC
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/customers - Create New Customer
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            customer_name, customer_phone, email, gstin, pan,
            credit_limit, credit_days, channel_id,
            route_id, dse_id,
            addresses, brand_pricing
        } = req.body;

        await client.query('BEGIN');

        // 1. Insert Customer
        const insertRes = await client.query(`
            INSERT INTO customers (
                customer_name, customer_phone, email, gstin, pan, 
                credit_limit, credit_days, channel_id,
                route_id, dse_id, is_active, whatsapp_number, route_type_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12)
            RETURNING id
        `, [
            customer_name, customer_phone, email, gstin, pan,
            credit_limit || 0, credit_days || 0, channel_id,
            route_id || null, dse_id || null, req.body.whatsapp_number, req.body.route_type_id || null
        ]);

        const custId = insertRes.rows[0].id;

        // 2. Insert Addresses
        if (addresses && addresses.length > 0) {
            for (const addr of addresses) {
                await client.query(`
                    INSERT INTO customer_addresses (
                        customer_id, address_line1, address_line2, city, state, pincode, 
                        is_default_billing, is_default_shipping, location_lat, location_lng
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    custId, addr.address_line1, addr.address_line2, addr.city, addr.state || 'Kerala', addr.pincode,
                    addr.is_default_billing || false, addr.is_default_shipping || false,
                    addr.location_lat || null, addr.location_lng || null
                ]);
            }
        }

        // 3. Insert Brand Pricing Overrides (Using channel_id)
        if (brand_pricing && brand_pricing.length > 0) {
            for (const bp of brand_pricing) {
                await client.query(`
                    INSERT INTO customer_brand_pricing (customer_id, brand_id, channel_id)
                    VALUES ($1, $2, $3)
                `, [custId, bp.brand_id, bp.channel_id]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, id: custId, message: 'Customer Created' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Routes Master
router.get('/meta/routes', async (req, res) => {
    const result = await pool.query('SELECT * FROM routes WHERE is_active = true ORDER BY route_name');
    res.json(result.rows);
});

// Channels Master (For Dropdown)
router.get('/meta/channels', async (req, res) => {
    const result = await pool.query('SELECT * FROM channels WHERE is_active = true ORDER BY id');
    res.json(result.rows);
});

// Helper: POST /api/customers/routes - Create Route
router.post('/meta/routes', async (req, res) => {
    try {
        const { route_name, description } = req.body;
        const resDb = await pool.query(
            'INSERT INTO routes (route_name, description) VALUES ($1, $2) RETURNING *',
            [route_name, description]
        );
        res.json(resDb.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
