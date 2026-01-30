const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/channels - List All Channels
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM channels ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
