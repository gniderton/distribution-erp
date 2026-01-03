const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/documents/sequences - List all
router.get('/sequences', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM document_sequences ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/documents/sequences/:id - Update prefix/current number
router.put('/sequences/:id', async (req, res) => {
    try {
        const { prefix, current_number } = req.body;
        await pool.query(
            'UPDATE document_sequences SET prefix = COALESCE($1, prefix), current_number = COALESCE($2, current_number) WHERE id = $3',
            [prefix, current_number, req.params.id]
        );
        res.json({ success: true, message: 'Sequence Updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
