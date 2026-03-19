const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. List all entities
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM asset_entities ORDER BY entity_name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Create new entity
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            entity_type,
            entity_name,
            contact_number,
            email,
            gst_number,
            pan_number,
            address,
            state,
            district,
            pincode,
            bank_account_id,
            account_no,
            ifsc_code,
            opening_balance
        } = req.body;

        await client.query('BEGIN');

        // Fetch and increment sequence
        const seqRes = await client.query(
            "SELECT prefix || LPAD(current_number::text, 4, '0') as code, id FROM document_sequences WHERE document_type = 'ASSET_ENT' FOR UPDATE"
        );
        const entityCode = seqRes.rows[0].code;
        await client.query("UPDATE document_sequences SET current_number = current_number + 1 WHERE id = $1", [seqRes.rows[0].id]);

        const result = await client.query(`
            INSERT INTO asset_entities (
                entity_code, entity_type, entity_name, contact_number, email, gst_number, pan_number,
                address, state, district, pincode, bank_account_id, account_no, ifsc_code, opening_balance
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            entityCode, entity_type, entity_name, contact_number, email, gst_number, pan_number,
            address, state, district, pincode, bank_account_id, account_no, ifsc_code, opening_balance || 0
        ]);

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 3. Update entity
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const fields = req.body;
        
        // Remove columns that shouldn't be updated manually via this simple loop
        delete fields.id;
        delete fields.entity_code;
        delete fields.created_at;
        delete fields.updated_at;

        const keys = Object.keys(fields);
        if (keys.length === 0) return res.status(400).json({ error: "No fields to update" });

        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const values = Object.values(fields);
        values.push(id);

        const result = await pool.query(
            `UPDATE asset_entities SET ${setClause} WHERE id = $${values.length} RETURNING *`,
            values
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Entity not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
