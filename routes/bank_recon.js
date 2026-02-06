const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { parseAxisCSV, parseIDFCText } = require('../utils/bankParser');

// Upload Bank Statement
router.post('/upload', async (req, res) => {
    let { content, bank_type } = req.body; // content: raw file text or base64, bank_type: 'Axis' | 'IDFC'

    if (!content || !bank_type) {
        return res.status(400).json({ error: "Content and bank_type are required" });
    }

    // Auto-decode base64 if it comes from Retool FilePicker
    if (content.length > 50 && !content.includes('\n') && !content.includes(',')) {
        try {
            content = Buffer.from(content, 'base64').toString('utf8');
        } catch (e) {
            console.log("Not base64, using raw content");
        }
    }

    let entries = [];
    try {
        if (bank_type === 'Axis') {
            entries = parseAxisCSV(content);
        } else if (bank_type === 'IDFC') {
            entries = parseIDFCText(content);
        } else {
            return res.status(400).json({ error: "Invalid bank_type. Use Axis or IDFC." });
        }

        if (entries.length === 0) {
            return res.status(400).json({ error: "No valid credit entries found in the file." });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const batchId = `BATCH-${Date.now()}`;

            for (let entry of entries) {
                await client.query(`
                    INSERT INTO bank_statement_entries (
                        transaction_date, bank_name, particulars, bank_ref_id, amount, upload_batch_id
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (bank_ref_id, amount, transaction_date) DO NOTHING
                `, [entry.transaction_date, entry.bank_name, entry.particulars, entry.bank_ref_id, entry.amount, batchId]);
            }

            await client.query('COMMIT');
            res.json({ success: true, count: entries.length, batchId });
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// List Bank Statement Entries
router.get('/list', async (req, res) => {
    try {
        const { bank_name, status, startDate, endDate, search } = req.query;
        let query = `SELECT * FROM bank_statement_entries WHERE 1=1`;
        const params = [];

        if (bank_name) {
            params.push(bank_name);
            query += ` AND bank_name = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }
        if (startDate && endDate) {
            params.push(startDate, endDate);
            query += ` AND transaction_date BETWEEN $${params.length - 1} AND $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (particulars ILIKE $${params.length} OR bank_ref_id ILIKE $${params.length})`;
        }

        query += ` ORDER BY transaction_date DESC, created_at DESC LIMIT 1000`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
