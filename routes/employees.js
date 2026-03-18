const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/employees/profile - Filter by Email (for Retool)
router.get('/profile', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const result = await pool.query(
            'SELECT id, full_name, employee_code, designation FROM employees WHERE email = $1 LIMIT 1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/employees - List Employees (Filter by Role/Designation)
router.get('/', async (req, res) => {
    try {
        const { role, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM employees WHERE employment_status = \'Active\'';
        const params = [];
        let pIdx = 1;

        if (role) {
            // Map common roles to IDs based on client feedback. DSE is 11 (Sales Exec) or 14 (Field Sales).
            if (role.toUpperCase() === 'DSE') {
                query += ` AND designation IN (11, 14)`;
            } else {
                query += ` AND designation = $${pIdx}`;
                params.push(role);
                pIdx++;
            }
        }

        query += ` ORDER BY full_name ASC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/employees - Create (Basic)
router.post('/', async (req, res) => {
    try {
        const { employee_code, full_name, designation, contact_primary } = req.body;
        // ... Minimal implementation for now, focused on DSE list ...
        const result = await pool.query(
            `INSERT INTO employees (employee_code, full_name, designation, contact_primary) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [employee_code, full_name, designation, contact_primary]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
