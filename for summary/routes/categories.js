const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/categories - List all categories
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, category_name, category_code FROM categories WHERE is_active = true ORDER BY category_name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
