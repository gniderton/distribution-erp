const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// POST /api/purchase-orders - Create a new Purchase Order
router.post('/', async (req, res) => {
    const {
        vendor_id,
        total_net,
        total_qty,
        gst,
        total_taxable,
        total_scheme,
        total_disc,
        remarks,
        lines
    } = req.body;

    // Basic Validation
    if (!vendor_id || !lines || lines.length === 0) {
        return res.status(400).json({ error: 'Vendor and at least one line item are required' });
    }

    try {
        // Call the RPC function (create_purchase_order)
        const query = `
            SELECT create_purchase_order(
                $1::INT, 
                $2::NUMERIC, 
                $3::NUMERIC, 
                $4::NUMERIC, 
                $5::NUMERIC, 
                $6::NUMERIC, 
                $7::NUMERIC, 
                $8::TEXT, 
                $9::JSONB
            ) as result;
        `;

        const values = [
            vendor_id,
            total_net || 0,
            total_qty || 0,
            gst || 0,
            total_taxable || 0,
            total_scheme || 0,
            total_disc || 0,
            remarks || '',
            JSON.stringify(lines)
        ];

        const { rows } = await pool.query(query, values);
        const result = rows[0].result;

        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json({ error: 'Failed to create PO' });
        }

    } catch (err) {
        console.error('Create PO Error:', err);
        res.status(500).json({ error: 'Database error creating Purchase Order', details: err.message });
    }
});

module.exports = router;
