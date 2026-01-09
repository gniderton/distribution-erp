const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/bank-accounts
// @desc    Get all active bank accounts
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, bank_name as name, account_number, current_balance, is_active 
            FROM bank_accounts 
            WHERE is_active = true 
            ORDER BY id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/bank-accounts
// @desc    Create a new bank account
router.post('/', async (req, res) => {
    try {
        const { bank_name, account_number, opening_balance } = req.body;

        const result = await pool.query(`
            INSERT INTO bank_accounts (bank_name, account_number, current_balance)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [bank_name, account_number, opening_balance || 0]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
