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
                c.whatsapp_number,
                rt.frequency_name as route_frequency,
                ca.address_line1, ca.city, ca.latitude, ca.longitude,
                (SELECT COUNT(*) FROM customer_addresses ca_inner WHERE ca_inner.customer_id = c.id) as address_count,
                 -- Pricing Exceptions
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
            LEFT JOIN LATERAL (
                SELECT address_line1, city, location_lat as latitude, location_lng as longitude
                FROM customer_addresses
                WHERE customer_id = c.id
                ORDER BY is_default_billing DESC, id ASC
                LIMIT 1
            ) ca ON true
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

// GET /api/customers/detailed-list - Maximum details including names for DSE/Route/Address
router.get('/detailed-list', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.*, 
                r.route_name, 
                e.full_name as dse_name, 
                ch.channel_name,
                ca.address_line1, ca.address_line2, ca.city, ca.state, ca.pincode,
                ca.location_lat, ca.location_lng,
                -- [NEW] Brand-specific Pricing Overrides
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
            LEFT JOIN employees e ON c.dse_id = e.id
            LEFT JOIN channels ch ON c.channel_id = ch.id
            LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_default_billing = true
            WHERE c.is_active = true
            ORDER BY c.customer_name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Detailed Customer List Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/customers/pending - List customers awaiting verification
router.get('/pending', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.id, c.customer_name, c.customer_code, c.customer_phone, c.gstin,
                ca.latitude, ca.longitude,
                c.created_at
            FROM customers c
            LEFT JOIN LATERAL (
                SELECT location_lat as latitude, location_lng as longitude
                FROM customer_addresses
                WHERE customer_id = c.id
                ORDER BY is_default_billing DESC, id ASC
                LIMIT 1
            ) ca ON true
            WHERE c.verification_status = 'Pending'
            ORDER BY c.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Pending List Error:', err);
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
                (
                    COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) +
                    COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) +
                    COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
                ) as amount_paid,
                (
                    si.grand_total - 
                    COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) -
                    COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) -
                    COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
                ) as balance_amount,
                si.status,
                c.customer_name
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            WHERE si.customer_id = $1 
              AND si.status != 'Cancelled'
              AND (
                si.grand_total - 
                COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) -
                COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) -
                COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
              ) > 0.01 
            ORDER BY si.invoice_date ASC
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/customers/:id/ledger - Get Customer Ledger
router.get('/:id/ledger', async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        // 1. Calculate Opening Balance (if startDate is provided)
        let openingBalance = 0;
        if (startDate) {
            const obRes = await pool.query(`
                SELECT 
                    COALESCE(SUM(debit_amount), 0) - COALESCE(SUM(credit_amount), 0) as opening_balance
                FROM view_customer_ledger
                WHERE customer_id = $1 AND date < $2
            `, [id, startDate]);
            openingBalance = parseFloat(obRes.rows[0].opening_balance) || 0;
        }

        // 2. Fetch Ledger Entries in Date Range
        let query = `
            SELECT * FROM view_customer_ledger 
            WHERE customer_id = $1
        `;
        const params = [id];
        let pIdx = 2;

        if (startDate) {
            query += ` AND date >= $${pIdx}`;
            params.push(startDate);
            pIdx++;
        }
        
        if (endDate) {
            query += ` AND date <= $${pIdx}`;
            params.push(endDate);
            pIdx++;
        }

        query += ` ORDER BY date ASC, id ASC`;

        const result = await pool.query(query, params);

        // 3. Compute Running Balance and Totals
        let currentBalance = openingBalance;
        let totalDebit = 0;
        let totalCredit = 0;

        const ledgerWithBalance = result.rows.map(row => {
            const debit = parseFloat(row.debit_amount) || 0;
            const credit = parseFloat(row.credit_amount) || 0;
            totalDebit += debit;
            totalCredit += credit;
            currentBalance = currentBalance + debit - credit;
            
            return {
                ...row,
                running_balance: currentBalance
            };
        });

        res.json({
            opening_balance: openingBalance,
            total_debit: totalDebit,
            total_credit: totalCredit,
            closing_balance: currentBalance,
            ledger: ledgerWithBalance
        });

    } catch (err) {
        console.error('Ledger error:', err);
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

        // 0. Auto-Generate Customer Code
        const seqRes = await client.query(`
            UPDATE document_sequences 
            SET current_number = current_number + 1 
            WHERE document_type = 'CUSTOMER' 
            RETURNING prefix, current_number
        `);

        let customerCode;
        if (seqRes.rows.length === 0) {
            customerCode = 'CS-00001'; // Fallback
        } else {
            const { prefix, current_number } = seqRes.rows[0];
            // Format: CS-00016
            customerCode = `${prefix}${String(current_number).padStart(5, '0')}`;
        }

        // 1. Insert Customer
        const insertRes = await client.query(`
            INSERT INTO customers (
                customer_name, customer_code, customer_phone, email, gstin, pan, 
                credit_limit, credit_days, channel_id,
                route_id, dse_id, is_active, whatsapp_number, route_type_id,
                verification_status -- [NEW]
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, $13, 'Pending')
            RETURNING id
        `, [
            customer_name, customerCode, customer_phone, email, gstin, pan,
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

// PUT /api/customers/:id - Update Customer (Designed for Appsmith JSONForm layout)
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        
        let payload = req.body;
        // Robust parsing: If Appsmith sends it as a string or wrapped in a "body" property
        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch(e) {}
        } else if (payload && payload.body && typeof payload.body === 'string') {
            try { payload = JSON.parse(payload.body); } catch(e) {}
        } else if (payload && Object.keys(payload).length === 1 && Object.keys(payload)[0].startsWith('{"')) {
            try { payload = JSON.parse(Object.keys(payload)[0]); } catch(e) {}
        }

        const bInfo = payload.Basic_Info || {};
        const taxInfo = payload.Tax_and_Accounting || {};
        const logInfo = payload.Logistics_Assignment || {};
        const defAddr = payload.Default_Address || {};

        await client.query('BEGIN');

        const updQuery = `
            UPDATE customers SET
                customer_name = $1, whatsapp_number = $2, email = $3, is_active = $4,
                gstin = $5, pan = $6, credit_limit = $7, credit_days = $8, channel_id = $9,
                route_id = $10, dse_id = $11, route_type_id = $12, route_sequence = $13
            WHERE id = $14
        `;
        await client.query(updQuery, [
            bInfo.customer_name, bInfo.whatsapp_number, bInfo.email, bInfo.is_active,
            taxInfo.gstin, taxInfo.pan, taxInfo.credit_limit || 0, taxInfo.credit_days || 0, taxInfo.channel_id || null,
            logInfo.route_id || null, logInfo.dse_id || null, logInfo.route_type_id || null, logInfo.route_sequence || 0,
            id
        ]);

        // Delete existing billing address
        await client.query(`DELETE FROM customer_addresses WHERE customer_id = $1 AND is_default_billing = true`, [id]);
        
        // Insert replaced billing address
        if (defAddr.address_line1 || defAddr.city) {
            await client.query(`
                INSERT INTO customer_addresses (
                    customer_id, address_line1, address_line2, city, state, pincode, 
                    is_default_billing, is_default_shipping, location_lat, location_lng
                ) VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, $8)
            `, [
                id, defAddr.address_line1, defAddr.address_line2, defAddr.city, defAddr.state, defAddr.pincode,
                defAddr.location_lat || null, defAddr.location_lng || null
            ]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Customer Updated' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Update Customer Error:', err);
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

// PUT /api/customers/:id/verify-request - DSE submits updates for verification
router.put('/:id/verify-request', async (req, res) => {
    try {
        const { id } = req.params;
        const { customer_phone, gstin, latitude, longitude } = req.body;

        const query = `
            UPDATE customers SET
                customer_phone = COALESCE($1, customer_phone),
                gstin = COALESCE($2, gstin),
                latitude = COALESCE($3, latitude),
                longitude = COALESCE($4, longitude),
                verification_status = 'Pending'
            WHERE id = $5
        `;
        await pool.query(query, [customer_phone, gstin, latitude, longitude, id]);
        
        res.json({ success: true, message: 'Verification request submitted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/customers/:id/verify - Admin approves verification
router.post('/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const { verified_by } = req.body;

        await pool.query(`
            UPDATE customers SET
                verification_status = 'Verified',
                last_verified_at = NOW(),
                verified_by = $1
            WHERE id = $2
        `, [verified_by, id]);

        res.json({ success: true, message: 'Customer verified successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
