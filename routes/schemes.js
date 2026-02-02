const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { calculateFreeItems } = require('../utils/schemeEngine');

// GET /api/schemes - List All Schemes with Filters
router.get('/', async (req, res) => {
    try {
        const { status, search, date_from, date_to } = req.query;

        let query = `
            SELECT 
                s.*,
                COUNT(sr.id) as rule_count,
                CASE 
                    WHEN s.end_date IS NOT NULL AND s.end_date < CURRENT_DATE THEN 'Expired'
                    WHEN s.is_active = true THEN 'Active'
                    ELSE 'Inactive'
                END as computed_status
            FROM schemes s
            LEFT JOIN scheme_rules sr ON s.id = sr.scheme_id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        if (status) {
            if (status === 'Expired') {
                query += ` AND s.end_date IS NOT NULL AND s.end_date < CURRENT_DATE`;
            } else if (status === 'Active') {
                query += ` AND s.is_active = true AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)`;
            } else if (status === 'Inactive') {
                query += ` AND s.is_active = false`;
            }
        }

        if (search) {
            query += ` AND s.scheme_name ILIKE $${paramCount}`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (date_from) {
            query += ` AND s.start_date >= $${paramCount}`;
            params.push(date_from);
            paramCount++;
        }

        if (date_to) {
            query += ` AND s.start_date <= $${paramCount}`;
            params.push(date_to);
            paramCount++;
        }

        query += ` GROUP BY s.id ORDER BY s.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Schemes List Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/schemes/:id - Get Single Scheme with Full Details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get scheme header
        const schemeRes = await pool.query('SELECT * FROM schemes WHERE id = $1', [id]);
        if (schemeRes.rows.length === 0) {
            return res.status(404).json({ error: 'Scheme not found' });
        }
        const scheme = schemeRes.rows[0];

        // Get all rules with product details
        const rulesRes = await pool.query(`
            SELECT 
                sr.*,
                p_trigger.product_name as trigger_product_name,
                p_reward.product_name as reward_product_name,
                b.brand_name as trigger_brand_name,
                c.category_name as trigger_category_name
            FROM scheme_rules sr
            LEFT JOIN products p_trigger ON sr.trigger_type = 'Product' AND sr.trigger_id = p_trigger.id
            LEFT JOIN products p_reward ON sr.reward_product_id = p_reward.id
            LEFT JOIN brands b ON sr.trigger_type = 'Brand' AND sr.trigger_id = b.id
            LEFT JOIN categories c ON sr.trigger_type = 'Category' AND sr.trigger_id = c.id
            WHERE sr.scheme_id = $1
            ORDER BY sr.tier_level, sr.min_qty
        `, [id]);

        // Get combo products for each rule
        for (const rule of rulesRes.rows) {
            if (rule.scheme_type === 'COMBO') {
                const comboRes = await pool.query(`
                    SELECT scp.product_id, p.product_name
                    FROM scheme_combo_products scp
                    JOIN products p ON scp.product_id = p.id
                    WHERE scp.scheme_rule_id = $1
                `, [rule.id]);
                rule.combo_products = comboRes.rows;
            }
        }

        scheme.rules = rulesRes.rows;
        res.json(scheme);

    } catch (err) {
        console.error('Scheme Detail Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/schemes - Create Scheme
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { scheme_name, description, start_date, end_date, is_active, rules } = req.body;

        await client.query('BEGIN');

        // Insert scheme header
        const resHead = await client.query(`
            INSERT INTO schemes (scheme_name, description, start_date, end_date, is_active)
            VALUES ($1, $2, $3, $4, $5) RETURNING id
        `, [scheme_name, description, start_date || new Date(), end_date, is_active !== false]);
        const schemeId = resHead.rows[0].id;

        // Insert rules
        if (rules && rules.length > 0) {
            for (const r of rules) {
                const ruleRes = await client.query(`
                    INSERT INTO scheme_rules (
                        scheme_id, scheme_type, trigger_type, trigger_id, min_qty, is_case_qty,
                        reward_product_id, reward_qty, special_price, tier_level, channel_tier, is_recursive
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING id
                `, [
                    schemeId,
                    r.scheme_type || 'BUY_GET_FREE',
                    r.trigger_type,
                    r.trigger_id,
                    r.min_qty,
                    r.is_case_qty || false,
                    r.reward_product_id || null,
                    r.reward_qty || 0,
                    r.special_price || null,
                    r.tier_level || 1,
                    r.channel_tier || null,
                    r.is_recursive !== false
                ]);

                const ruleId = ruleRes.rows[0].id;

                // Insert combo products if COMBO type
                if (r.scheme_type === 'COMBO' && r.combo_products && r.combo_products.length > 0) {
                    for (const productId of r.combo_products) {
                        await client.query(`
                            INSERT INTO scheme_combo_products (scheme_rule_id, product_id)
                            VALUES ($1, $2)
                        `, [ruleId, productId]);
                    }
                }
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, id: schemeId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create Scheme Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// PUT /api/schemes/:id - Update Scheme
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { scheme_name, description, start_date, end_date, is_active, rules } = req.body;

        await client.query('BEGIN');

        // Update scheme header
        await client.query(`
            UPDATE schemes 
            SET scheme_name = $1, description = $2, start_date = $3, end_date = $4, is_active = $5
            WHERE id = $6
        `, [scheme_name, description, start_date, end_date, is_active, id]);

        // Delete existing rules and combo products (cascade will handle combo products)
        await client.query('DELETE FROM scheme_rules WHERE scheme_id = $1', [id]);

        // Insert new rules
        if (rules && rules.length > 0) {
            for (const r of rules) {
                const ruleRes = await client.query(`
                    INSERT INTO scheme_rules (
                        scheme_id, scheme_type, trigger_type, trigger_id, min_qty, is_case_qty,
                        reward_product_id, reward_qty, special_price, tier_level, channel_tier, is_recursive
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING id
                `, [
                    id,
                    r.scheme_type || 'BUY_GET_FREE',
                    r.trigger_type,
                    r.trigger_id,
                    r.min_qty,
                    r.is_case_qty || false,
                    r.reward_product_id || null,
                    r.reward_qty || 0,
                    r.special_price || null,
                    r.tier_level || 1,
                    r.channel_tier || null,
                    r.is_recursive !== false
                ]);

                const ruleId = ruleRes.rows[0].id;

                // Insert combo products if COMBO type
                if (r.scheme_type === 'COMBO' && r.combo_products && r.combo_products.length > 0) {
                    for (const productId of r.combo_products) {
                        await client.query(`
                            INSERT INTO scheme_combo_products (scheme_rule_id, product_id)
                            VALUES ($1, $2)
                        `, [ruleId, productId]);
                    }
                }
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Update Scheme Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// DELETE /api/schemes/:id - Delete Scheme
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM schemes WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete Scheme Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/schemes/:id/toggle - Toggle Active Status
router.patch('/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            UPDATE schemes 
            SET is_active = NOT is_active 
            WHERE id = $1 
            RETURNING is_active
        `, [id]);
        res.json({ success: true, is_active: result.rows[0].is_active });
    } catch (err) {
        console.error('Toggle Scheme Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/schemes/calculate - The Engine (unchanged)
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
