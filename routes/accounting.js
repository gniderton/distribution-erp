const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. List Journal Entries (with summary info)
router.get('/journal-entries', async (req, res) => {
    try {
        const { start_date, end_date, reference_type } = req.query;
        let query = `
            SELECT 
                je.id, 
                je.transaction_date, 
                je.description, 
                je.reference_type, 
                je.reference_id, 
                je.created_at,
                (SELECT SUM(debit) FROM journal_lines WHERE journal_entry_id = je.id) as total_amount
            FROM journal_entries je
            WHERE 1=1
        `;
        const params = [];

        if (start_date) {
            params.push(start_date);
            query += ` AND je.transaction_date >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            query += ` AND je.transaction_date <= $${params.length}`;
        }
        if (reference_type) {
            params.push(reference_type);
            query += ` AND je.reference_type = $${params.length}`;
        }

        query += ` ORDER BY je.transaction_date DESC, je.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Single Journal Entry with Lines
router.get('/journal-entries/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const headerRes = await pool.query(`
            SELECT * FROM journal_entries WHERE id = $1
        `, [id]);

        if (headerRes.rows.length === 0) return res.status(404).json({ error: "Journal entry not found" });

        const linesRes = await pool.query(`
            SELECT 
                jl.id, 
                jl.account_id, 
                coa.code as account_code, 
                coa.name as account_name, 
                jl.debit, 
                jl.credit
            FROM journal_lines jl
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE jl.journal_entry_id = $1
            ORDER BY jl.debit DESC, jl.id ASC
        `, [id]);

        res.json({
            ...headerRes.rows[0],
            lines: linesRes.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
