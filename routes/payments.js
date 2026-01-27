const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- DSE HELPERS (Mobile App) ---

// GET /api/payments/ledger/:customerId - View Transactions
router.get('/ledger/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const result = await pool.query(
            "SELECT * FROM view_customer_ledger WHERE customer_id = $1 ORDER BY id DESC LIMIT 50",
            [customerId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payments/invoices/:customerId - Recent Invoices
router.get('/invoices/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const result = await pool.query(
            "SELECT * FROM sales_invoices WHERE customer_id = $1 ORDER BY invoice_date DESC LIMIT 20",
            [customerId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/payments - Collect Payment (DSE)
router.post('/', async (req, res) => {
    try {
        const {
            customer_id, amount, payment_mode,
            transaction_ref, collected_by, payment_date,
            location_lat, location_lng // [NEW] GPS
        } = req.body;

        const result = await pool.query(`
            INSERT INTO customer_payments (
                customer_id, amount, payment_mode, 
                transaction_ref, collected_by, payment_date, 
                location_lat, location_lng,
                status -- Default is 'Pending'
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')
            RETURNING id, status
        `, [
            customer_id, amount, payment_mode,
            transaction_ref, collected_by, payment_date || new Date(),
            location_lat, location_lng
        ]);

        res.status(201).json({
            success: true,
            id: result.rows[0].id,
            message: 'Payment Recorded. Pending Verification.'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// --- ADMIN VERIFICATION (Web Dashboard) ---

// POST /api/payments/:id/verify - Approve Payment
router.post('/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const { verified_by } = req.body; // Officer ID

        const result = await pool.query(`
            UPDATE customer_payments 
            SET status = 'Verified', verified_by = $1, verified_at = NOW()
            WHERE id = $2 AND status = 'Pending'
            RETURNING id
        `, [verified_by, id]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Payment not found or already processed' });

        res.json({ success: true, message: 'Payment Verified' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/payments/:id/reject - Reject Payment
router.post('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason, verified_by } = req.body;

        const result = await pool.query(`
            UPDATE customer_payments 
            SET status = 'Rejected', rejection_reason = $1, verified_by = $2, verified_at = NOW()
            WHERE id = $3 AND status = 'Pending'
            RETURNING id
        `, [rejection_reason, verified_by, id]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Payment not found or already processed' });

        res.json({ success: true, message: 'Payment Rejected' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
