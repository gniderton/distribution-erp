const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- Income Entities ---

// 1. List Income Entities
router.get('/income', async (req, res) => {
    try {
        const result = await pool.query('SELECT name, phone, gst_no, bank_name, account_no, ifsc_code, id, * FROM income_entities WHERE is_active = true ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Create Income Entity
router.post('/income', async (req, res) => {
    const { name, phone, email, gst_no, address, bank_name, account_no, ifsc_code } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    try {
        const result = await pool.query(`
            INSERT INTO income_entities (name, phone, email, gst_no, address, bank_name, account_no, ifsc_code)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [name, phone, email, gst_no, address, bank_name, account_no, ifsc_code]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Income Entity Ledger
router.get('/income/:id/ledger', async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.query;
        let query = 'SELECT * FROM view_income_entity_ledger WHERE entity_id = $1';
        const params = [id];

        if (start_date) {
            params.push(start_date);
            query += ` AND date >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            query += ` AND date <= $${params.length}`;
        }
        query += ' ORDER BY date ASC, sort_id ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Expense Entities ---

// 4. List Expense Entities
router.get('/expense', async (req, res) => {
    try {
        const result = await pool.query('SELECT name, phone, gst_no, bank_name, account_no, ifsc_code, id, * FROM expense_entities WHERE is_active = true ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Create Expense Entity
router.post('/expense', async (req, res) => {
    const { name, phone, email, gst_no, address, bank_name, account_no, ifsc_code } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    try {
        const result = await pool.query(`
            INSERT INTO expense_entities (name, phone, email, gst_no, address, bank_name, account_no, ifsc_code)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [name, phone, email, gst_no, address, bank_name, account_no, ifsc_code]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Get Expense Entity Ledger
router.get('/expense/:id/ledger', async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.query;
        let query = 'SELECT * FROM view_expense_entity_ledger WHERE entity_id = $1';
        const params = [id];

        if (start_date) {
            params.push(start_date);
            query += ` AND date >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            query += ` AND date <= $${params.length}`;
        }
        query += ' ORDER BY date ASC, sort_id ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
