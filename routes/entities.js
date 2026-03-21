const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- Income Entities ---

// 1. List Income Entities
router.get('/income', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM income_entities WHERE is_active = true ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Create Income Entity
router.post('/income', async (req, res) => {
    const { name, phone, email, gst_no, address } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    try {
        const result = await pool.query(`
            INSERT INTO income_entities (name, phone, email, gst_no, address)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [name, phone, email, gst_no, address]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Expense Entities ---

// 3. List Expense Entities
router.get('/expense', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM expense_entities WHERE is_active = true ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Create Expense Entity
router.post('/expense', async (req, res) => {
    const { name, phone, email, gst_no, address } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    try {
        const result = await pool.query(`
            INSERT INTO expense_entities (name, phone, email, gst_no, address)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [name, phone, email, gst_no, address]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
