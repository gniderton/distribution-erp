const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/debit-notes/vendor/:id
// @desc    Get all Debit Notes for a Vendor
router.get('/vendor/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT dn.*, v.vendor_name 
            FROM debit_notes dn
            JOIN vendors v ON dn.vendor_id = v.id
            WHERE dn.vendor_id = $1
            ORDER BY dn.debit_note_date DESC
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('List Debit Notes Error:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/debit-notes
// @desc    Create a new Debit Note (Financial Adjustment)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            vendor_id,
            amount,
            debit_note_date,
            reason,
            linked_invoice_id
        } = req.body;

        if (!vendor_id || !amount || Number(amount) <= 0) {
            return res.status(400).json({ error: 'Vendor and Valid Amount required' });
        }

        await client.query('BEGIN');

        // 1. Generate Debit Note Number (Simple logic: DN-{Timestamp})
        // Real-world: Use a Sequence table like POs.
        // For now: timestamp is unique enough for V1.
        const dnNumber = `DN-${Date.now().toString().slice(-6)}`;

        // 2. Insert Record
        const insertRes = await client.query(`
            INSERT INTO debit_notes 
            (vendor_id, debit_note_number, debit_note_date, amount, reason, linked_invoice_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Approved')
            RETURNING id, debit_note_number
        `, [
            vendor_id,
            dnNumber,
            debit_note_date || new Date(),
            amount,
            reason,
            linked_invoice_id
        ]);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Debit Note Created',
            id: insertRes.rows[0].id,
            dn_number: insertRes.rows[0].debit_note_number
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create Debit Note Error:', err.message);
        res.status(500).json({ error: 'Server Error creating Debit Note' });
    } finally {
        client.release();
    }
});

module.exports = router;
