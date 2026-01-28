const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { calculateFreeItems } = require('../utils/schemeEngine');

// GET /api/schemes - List Active Schemes
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, 
                   json_agg(sr.*) as rules 
            FROM schemes s
            LEFT JOIN scheme_rules sr ON s.id = sr.scheme_id
            WHERE s.is_active = true
            GROUP BY s.id
            ORDER BY s.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/schemes - Create Scheme
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { scheme_name, start_date, end_date, rules } = req.body;

        await client.query('BEGIN');

        const resHead = await client.query(`
            INSERT INTO schemes (scheme_name, start_date, end_date)
            VALUES ($1, $2, $3) RETURNING id
        `, [scheme_name, start_date || new Date(), end_date]);
        const schemeId = resHead.rows[0].id;

        if (rules && rules.length > 0) {
            for (const r of rules) {
                await client.query(`
                    INSERT INTO scheme_rules (
                        scheme_id, trigger_type, trigger_id, min_qty, is_case_qty,
                        reward_product_id, reward_qty, tier_level, is_recursive
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    schemeId, r.trigger_type, r.trigger_id, r.min_qty, r.is_case_qty || false,
                    r.reward_product_id || null, r.reward_qty, r.tier_level || 1, r.is_recursive !== false
                ]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, id: schemeId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// POST /api/schemes/calculate - The Engine
router.post('/calculate', async (req, res) => {
    try {
        const { items } = req.body;
        const freeItems = await calculateFreeItems(items);
        res.json({ success: true, free_items: freeItems });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
