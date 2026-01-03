const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Helper function for simple gets
const getTable = (table) => async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE is_active = true ORDER BY id ASC`);
        res.json(result.rows);
    } catch (err) {
        console.error(`Error fetching ${table}:`, err);
        res.status(500).json({ error: err.message });
    }
};

router.get('/taxes', getTable('taxes'));
router.get('/hsn', getTable('hsn_codes'));
router.get('/brands', getTable('brands'));
router.get('/categories', getTable('categories'));
router.get('/vendor-addresses', getTable('vendor_addresses')); // All addresses

module.exports = router;
