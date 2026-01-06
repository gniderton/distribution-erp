const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/purchase-invoices
// @desc    Get all Purchase Invoices (GRNs)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                pi.id,
                pi.invoice_number,
                pi.vendor_invoice_number,
                pi.vendor_invoice_date,
                pi.received_date,
                pi.status,
                pi.grand_total,
                v.name as vendor_name,
                ph.po_number -- If linked
            FROM purchase_invoice_headers pi
            JOIN vendors v ON pi.vendor_id = v.id
            LEFT JOIN purchase_order_headers ph ON pi.purchase_order_id = ph.id
            ORDER BY pi.id DESC
        `);

        // Retool expects an array
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/purchase-invoices
// @desc    Create new Purchase Invoice (RPC Trigger)
router.post('/', async (req, res) => {
    try {
        const {
            vendor_id,
            purchase_order_id,
            invoice_number,
            invoice_date,
            received_date,
            total_net,
            tax_amount,
            grand_total,
            lines
        } = req.body;

        // Call the RPC we created
        const result = await pool.query(
            `SELECT create_purchase_invoice(
                $1, $2, $3, $4, $5, $6, $7, $8, $9
            ) as response`,
            [
                vendor_id,
                purchase_order_id,
                invoice_number,
                invoice_date,
                received_date,
                total_net,
                tax_amount,
                grand_total,
                JSON.stringify(lines)
            ]
        );

        res.json(result.rows[0].response);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
