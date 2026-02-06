const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { parseAxisCSV, parseIDFCText, parseExcel } = require('../utils/bankParser');

// Upload Bank Statement
router.post('/upload', async (req, res) => {
    let { content, bank_type } = req.body; // content: raw file text or base64, bank_type: 'Axis' | 'IDFC'

    if (!content) return res.status(400).json({ error: "Missing 'content' field. Ensure your FilePicker is correctly linked." });
    if (!bank_type) return res.status(400).json({ error: "Missing 'bank_type' field. Ensure your Select component is correctly linked." });

    let entries = [];
    let buffer = null;

    // Detect if content is Base64 (Retool FilePicker default)
    if (content.length > 50 && !content.includes('\n') && !content.includes(',')) {
        try {
            buffer = Buffer.from(content, 'base64');
            // Check for XLSX magic bytes "PK" (50 4B)
            if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
                // It's an Excel file
            } else {
                // Try to treat as text
                content = buffer.toString('utf8');
                buffer = null;
            }
        } catch (e) {
            console.log("Decoding issue, using raw content");
        }
    }

    try {
        const client = await pool.connect();
        try {
            // Resolve bank_name if bank_type is a numeric ID
            if (!isNaN(bank_type)) {
                const bankLookup = await client.query('SELECT bank_name FROM bank_accounts WHERE id = $1', [bank_type]);
                if (bankLookup.rows.length > 0) {
                    bank_type = bankLookup.rows[0].bank_name;
                }
            }

            const typeNormalized = bank_type.toLowerCase();

            if (buffer) {
                // Handle Excel
                entries = parseExcel(buffer, bank_type);
            } else {
                // Handle Text/CSV
                if (typeNormalized.includes('axis')) {
                    entries = parseAxisCSV(content);
                } else if (typeNormalized.includes('idfc')) {
                    entries = parseIDFCText(content);
                } else {
                    return res.status(400).json({ error: `Invalid bank_type '${bank_type}'. Use Axis, IDFC, or provide an Excel file.` });
                }
            }

            if (entries.length === 0) {
                return res.status(400).json({ error: "No valid credit entries found in the file." });
            }

            await client.query('BEGIN');
            const batchId = `BATCH-${Date.now()}`;

            for (let entry of entries) {
                await client.query(`
                    INSERT INTO bank_statement_entries (
                        transaction_date, bank_name, particulars, bank_ref_id, 
                        debit_amount, credit_amount, amount, upload_batch_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (transaction_date, particulars, debit_amount, credit_amount) DO NOTHING
                `, [
                    entry.transaction_date,
                    entry.bank_name,
                    entry.particulars,
                    entry.bank_ref_id || null,
                    entry.debit_amount || 0,
                    entry.credit_amount || 0,
                    entry.credit_amount || 0, // Legacy amount column = credit
                    batchId
                ]);
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
