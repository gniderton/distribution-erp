const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. POST /api/verify-requests - DSE submits update or new customer
router.post('/', async (req, res) => {
    try {
        // RESILIENT PARSING: Handle if body is sent as a string (common in some Appsmith/Retool setups)
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        let { customer_id, dse_id, name, phone, gstin, latitude, longitude } = body;
        
        // STRICTOR SANITIZATION: Retool often sends the string "null" for empty fields
        if (customer_id === 'null' || customer_id === '') customer_id = null;
        if (dse_id === 'null' || dse_id === '') dse_id = null;

        console.log('Verification Request Received:', body);

        const query = `
            INSERT INTO customer_verification_requests (
                customer_id, dse_id, proposed_customer_name, 
                proposed_phone, proposed_gstin, latitude, longitude
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `;
        const result = await pool.query(query, [
            customer_id, 
            dse_id, 
            name || null, 
            phone || null, 
            gstin || null, 
            latitude || 0, 
            longitude || 0
        ]);
        res.status(201).json({ success: true, id: result.rows[0].id, message: 'Request submitted for Admin approval' });
    } catch (err) {
        console.error('Verify Request Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. GET /api/verify-requests/pending - Admin lists pending requests
router.get('/pending', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT vr.*, c.customer_code as current_code, e.full_name as dse_name
            FROM customer_verification_requests vr
            LEFT JOIN customers c ON vr.customer_id = c.id
            LEFT JOIN employees e ON vr.dse_id = e.id
            WHERE vr.status = 'Pending'
            ORDER BY vr.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. POST /api/verify-requests/:id/approve - Admin finalizes and pushes to Main Tables
router.post('/:id/approve', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { 
            reviewed_by, 
            customer_id, // [NEW] Optional ID if already created via external JSON form
            route_id, channel_id, route_type_id, credit_limit, credit_days 
        } = req.body;

        await client.query('BEGIN');

        // Fetch the request data
        const reqRes = await client.query('SELECT * FROM customer_verification_requests WHERE id = $1', [id]);
        if (reqRes.rows.length === 0) throw new Error('Request not found');
        const r = reqRes.rows[0];

        // LOGIC: If a customer_id is provided, we just link and approve. 
        // If NOT, we run the full auto-creation/update logic.
        let finalCustomerId = customer_id || r.customer_id;

        if (customer_id && !r.customer_id) {
            // This was a NEW customer request that was processed externally 
            // We just need to mark the request as approved and linked to the new ID.
            await client.query(`UPDATE customer_verification_requests SET customer_id = $1 WHERE id = $2`, [customer_id, id]);
            // Also update the customer record to be verified
            await client.query(`UPDATE customers SET is_verified = true, verification_status = 'Verified' WHERE id = $1`, [customer_id]);
        } else if (finalCustomerId) {
            // CASE A: UPDATE EXISTING CUSTOMER
            await client.query(`
                UPDATE customers SET
                    customer_name = COALESCE($1, customer_name),
                    customer_phone = COALESCE($2, customer_phone),
                    gstin = COALESCE($3, gstin),
                    route_id = COALESCE($4, route_id),
                    channel_id = COALESCE($5, channel_id),
                    route_type_id = COALESCE($6, route_type_id),
                    credit_limit = COALESCE($7, credit_limit),
                    credit_days = COALESCE($8, credit_days),
                    is_verified = true,
                    verification_status = 'Verified'
                WHERE id = $9
            `, [r.proposed_customer_name, r.proposed_phone, r.proposed_gstin, route_id, channel_id, route_type_id, credit_limit, credit_days, finalCustomerId]);

            // Update EXISTING default address with new GPS
            const addrUpdate = await client.query(`
                UPDATE customer_addresses 
                SET location_lat = $1, location_lng = $2
                WHERE customer_id = $3 AND is_default_billing = true
                RETURNING id
            `, [r.latitude, r.longitude, finalCustomerId]);

            if (addrUpdate.rows.length === 0) {
                await client.query(`
                    INSERT INTO customer_addresses (customer_id, address_line1, city, location_lat, location_lng, is_default_billing, is_default_shipping)
                    VALUES ($1, 'Captured in Field', 'Captured in Field', $2, $3, true, true)
                `, [finalCustomerId, r.latitude, r.longitude]);
            }

        } else {
            // CASE B: CREATE NEW CUSTOMER
            const seqRes = await client.query(`UPDATE document_sequences SET current_number = current_number + 1 WHERE document_type = 'CUSTOMER' RETURNING prefix, current_number`);
            const customerCode = `${seqRes.rows[0].prefix}${String(seqRes.rows[0].current_number).padStart(5, '0')}`;

            const insertRes = await client.query(`
                INSERT INTO customers (
                    customer_name, customer_code, customer_phone, gstin,
                    route_id, dse_id, channel_id, route_type_id, credit_limit, credit_days, 
                    is_verified, verification_status, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 'Verified', true)
                RETURNING id
            `, [r.proposed_customer_name, customerCode, r.proposed_phone, r.proposed_gstin, route_id, r.dse_id, channel_id, route_type_id, credit_limit, credit_days]);
            
            finalCustomerId = insertRes.rows[0].id;

            await client.query(`
                INSERT INTO customer_addresses (customer_id, address_line1, city, location_lat, location_lng, is_default_billing, is_default_shipping)
                VALUES ($1, 'Captured in Field', 'Captured in Field', $2, $3, true, true)
            `, [finalCustomerId, r.latitude, r.longitude]);
        }

        await client.query(`UPDATE customer_verification_requests SET status = 'Approved', reviewed_at = NOW(), reviewed_by = $1 WHERE id = $2`, [reviewed_by, id]);

        await client.query('COMMIT');
        res.json({ success: true, customer_id: finalCustomerId, message: 'Approval processed successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Approval Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 4. POST /api/verify-requests/:id/reject - Admin declines the request
router.post('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reviewed_by, rejection_reason } = req.body;

        await pool.query(`
            UPDATE customer_verification_requests SET 
                status = 'Rejected', 
                reviewed_at = NOW(), 
                reviewed_by = $1, 
                rejection_reason = $2 
            WHERE id = $3
        `, [reviewed_by, rejection_reason, id]);

        res.json({ success: true, message: 'Request rejected' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
