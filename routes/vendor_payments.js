const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/vendor-payments/ledger/:vendor_id
// @desc    Get chronological ledger (Invoices, Payments, Returns)
router.get('/ledger/:vendor_id', async (req, res) => {
    try {
        const { vendor_id } = req.params;

        // Query the View we created
        const result = await pool.query(`
            SELECT * FROM view_vendor_ledger 
            WHERE vendor_id = $1 
            ORDER BY date DESC, created_at DESC
        `, [vendor_id]);

        // Calculate Running Balance in JS (easier than SQL window functions sometimes)
        // Or trust the frontend to do it. 
        // For now, raw data is best.
        res.json(result.rows);

    } catch (err) {
        console.error('Ledger Error:', err.message);
        res.status(500).json({ error: 'Server Error fetching ledger' });
    }
});


// @route   POST /api/vendor-payments
// @desc    Record a payment and allocate to bills
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            vendor_id,
            amount, // Total Payment Amount
            payment_date,
            mode,
            transaction_ref,
            remarks,
            allocations // Array of { invoice_id, amount }
        } = req.body;

        if (!vendor_id || !amount || Number(amount) <= 0) {
            return res.status(400).json({ error: 'Vendor and Valid Amount required' });
        }

        await client.query('BEGIN');

        // 1. Create Payment Record
        const paymentRes = await client.query(`
            INSERT INTO vendor_payments 
            (vendor_id, amount, payment_date, payment_mode, transaction_ref, remarks)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [vendor_id, amount, payment_date, mode, transaction_ref, remarks]);

        const paymentId = paymentRes.rows[0].id;

        // 2. Create Allocations (if any)
        if (allocations && Array.isArray(allocations) && allocations.length > 0) {
            for (const alloc of allocations) {
                if (alloc.invoice_id && alloc.amount > 0) {
                    await client.query(`
                        INSERT INTO payment_allocations 
                        (payment_id, purchase_invoice_id, amount)
                        VALUES ($1, $2, $3)
                    `, [paymentId, alloc.invoice_id, alloc.amount]);
                }
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Payment Recorded',
            id: paymentId
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Payment Error:', err.message);
        res.status(500).json({ error: 'Server Error recording payment' });
    } finally {
        client.release();
    }
});

module.exports = router;
