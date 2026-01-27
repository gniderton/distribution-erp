const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/employees - List Employees (Filter by Role/Designation)
router.get('/', async (req, res) => {
    try {
        const { role, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM employees WHERE employment_status = \'Active\'';
        const params = [];
        let pIdx = 1;

        if (role) {
            query += ` AND designation ILIKE $${pIdx}`;
            params.push(role); // e.g. 'DSE'
            pIdx++;
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
