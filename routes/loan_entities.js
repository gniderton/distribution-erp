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
    const { entity_name, entity_type, role_type, contact_number, email, address, notes, is_active, reference_id } = req.body;
    try {
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
    const { entity_name, entity_type, role_type, contact_number, email, address, notes, is_active, reference_id } = req.body;
    
    try {
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
