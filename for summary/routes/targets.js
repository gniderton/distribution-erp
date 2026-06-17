const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- INCENTIVE PLANS (TEMPLATES) ---

// @route   GET /api/targets/plans
// @desc    List all incentive plans
router.get('/plans', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM incentive_plans WHERE is_active = TRUE ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/targets/plans
// @desc    Create or update an incentive plan
router.post('/plans', async (req, res) => {
    try {
        const { id, name, description, config, is_active } = req.body;
        
        if (id) {
            const result = await pool.query(`
                UPDATE incentive_plans 
                SET name = $1, description = $2, config = $3, is_active = $4 
                WHERE id = $5 RETURNING *
            `, [name, description, config, is_active !== false, id]);
            return res.json(result.rows[0]);
        }

        const result = await pool.query(`
            INSERT INTO incentive_plans (name, description, config) 
            VALUES ($1, $2, $3) RETURNING *
        `, [name, description, config]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- EMPLOYEE TARGETS (ASSIGNMENTS) ---

// @route   GET /api/targets
// @desc    List all targets for a specific month/year
router.get('/', async (req, res) => {
    try {
        const { month, year } = req.query;
        let query = `
            SELECT t.*, e.full_name, e.employee_code, p.name as plan_name, p.config as plan_config
            FROM employee_targets t
            JOIN employees e ON t.employee_id = e.id
            JOIN incentive_plans p ON t.plan_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (month) {
            params.push(month);
            query += ` AND t.month = $${params.length}`;
        }
        if (year) {
            params.push(year);
            query += ` AND t.year = $${params.length}`;
        }

        query += ` ORDER BY e.full_name ASC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/targets
// @desc    Assign employee to a plan + set monthly target
router.post('/', async (req, res) => {
    try {
        const { employee_id, plan_id, month, year, sales_target_taxable } = req.body;

        if (!employee_id || !plan_id || !month || !year) {
            return res.status(400).json({ error: "employee_id, plan_id, month, and year are required" });
        }

        const query = `
            INSERT INTO employee_targets (employee_id, plan_id, month, year, sales_target_taxable)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (employee_id, month, year) DO UPDATE SET
                plan_id = EXCLUDED.plan_id,
                sales_target_taxable = EXCLUDED.sales_target_taxable,
                created_at = NOW()
            RETURNING *
        `;

        const result = await pool.query(query, [employee_id, plan_id, month, year, sales_target_taxable || 0]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
