const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/loan-entities
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM loan_entities ORDER BY entity_name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/loan-entities/active
router.get('/active', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM loan_entities WHERE is_active = true ORDER BY entity_name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/loan-entities
router.post('/', async (req, res) => {
    let { entity_name, entity_type, role_type, contact_number, email, address, notes, is_active, reference_id } = req.body;
    try {
        // Auto-fetch missing details if it's an employee
        if (entity_type === 'Employee' && reference_id) {
            const empRes = await pool.query('SELECT * FROM employees WHERE id = $1', [reference_id]);
            if (empRes.rows.length > 0) {
                const emp = empRes.rows[0];
                if (!entity_name || !isNaN(entity_name)) entity_name = emp.full_name || emp.name;
                contact_number = contact_number || emp.contact_primary || emp.contact_no || '';
                email = email || emp.email || '';
                address = address || emp.current_address || emp.address || '';
            }
        }

        const result = await pool.query(`
            INSERT INTO loan_entities (
                entity_name, entity_type, role_type, contact_number, email, address, notes, is_active, reference_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true), $9)
            RETURNING *
        `, [entity_name, entity_type, role_type, contact_number, email, address, notes, is_active, reference_id]);
        
        res.status(201).json({ success: true, data: result.rows[0], message: "Loan Entity Created" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/loan-entities/:id
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    let { entity_name, entity_type, role_type, contact_number, email, address, notes, is_active, reference_id } = req.body;
    
    try {
        // Auto-fetch missing details if it's an employee
        if (entity_type === 'Employee' && reference_id) {
            const empRes = await pool.query('SELECT * FROM employees WHERE id = $1', [reference_id]);
            if (empRes.rows.length > 0) {
                const emp = empRes.rows[0];
                if (!entity_name || !isNaN(entity_name)) entity_name = emp.full_name || emp.name;
                contact_number = contact_number || emp.contact_primary || emp.contact_no || '';
                email = email || emp.email || '';
                address = address || emp.current_address || emp.address || '';
            }
        }

        const result = await pool.query(`
            UPDATE loan_entities SET
                entity_name = COALESCE($1, entity_name),
                entity_type = COALESCE($2, entity_type),
                role_type = COALESCE($3, role_type),
                contact_number = COALESCE($4, contact_number),
                email = COALESCE($5, email),
                address = COALESCE($6, address),
                notes = COALESCE($7, notes),
                is_active = COALESCE($8, is_active),
                reference_id = COALESCE($9, reference_id)
            WHERE id = $10
            RETURNING *
        `, [entity_name, entity_type, role_type, contact_number, email, address, notes, is_active, reference_id, id]);
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Loan Entity not found' });
        res.json({ success: true, data: result.rows[0], message: "Loan Entity Updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
