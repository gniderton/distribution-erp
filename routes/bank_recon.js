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

    // 🛡️ Data Sanitization for Appsmith
    if (typeof content !== 'string') {
        return res.status(400).json({ error: "Invalid 'content' type. Please ensure you have set Data Format to 'Base64' in Appsmith's FilePicker." });
    }

    // Detect and Strip Data URI prefix (e.g., data:application/pdf;base64,....)
    const isDataURI = content.startsWith('data:') && content.includes(';base64,');
    if (isDataURI) {
        content = content.split(';base64,').pop();
    }

    // Detect if content is Base64 (Retool/Appsmith FilePicker default)
    const isBase64 = content.length > 50 && (!content.includes('\n') || isDataURI);
    if (isBase64) {
        try {
            buffer = Buffer.from(content, 'base64');
            // Check for XLSX magic bytes "PK" (50 4B)
            if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
                // It's an Excel file, keep buffer
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
            let { bank_account_id } = req.body;

            // Resolve bank_name and account_id if bank_type is a numeric ID (Retool default)
            if (!isNaN(bank_type)) {
                bank_account_id = parseInt(bank_type);
                const bankLookup = await client.query('SELECT bank_name FROM bank_accounts WHERE id = $1', [bank_account_id]);
                if (bankLookup.rows.length > 0) {
                    bank_type = bankLookup.rows[0].bank_name;
                }
            }

            if (!bank_account_id) return res.status(400).json({ error: "Missing 'bank_account_id'. Please select an account from api/bank-accounts." });

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
                // 🛡️ Smart De-duplication Check
                const existing = await client.query(`
                    SELECT id FROM bank_statement_entries 
                    WHERE bank_account_id = $5 AND (
                        (bank_ref_id IS NOT NULL AND bank_ref_id = $1 AND amount = $2 AND transaction_date = $3)
                        OR (transaction_date = $3 AND LOWER(REGEXP_REPLACE(particulars, '[^a-zA-Z0-9]', '', 'g')) = LOWER(REGEXP_REPLACE($4, '[^a-zA-Z0-9]', '', 'g')) AND debit_amount = $6 AND credit_amount = $7)
                    )
                    LIMIT 1
                `, [entry.bank_ref_id || null, entry.amount || 0, entry.transaction_date, entry.particulars, bank_account_id, entry.debit_amount || 0, entry.credit_amount || 0]);

                if (existing.rows.length === 0) {
                    await client.query(`
                        INSERT INTO bank_statement_entries (
                            transaction_date, bank_name, particulars, bank_ref_id, 
                            debit_amount, credit_amount, amount, upload_batch_id,
                            bank_account_id
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `, [
                        entry.transaction_date,
                        entry.bank_name,
                        entry.particulars,
                        entry.bank_ref_id || null,
                        entry.debit_amount || 0,
                        entry.credit_amount || 0,
                        entry.amount || 0, 
                        batchId,
                        bank_account_id
                    ]);
                }
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

// [NEW] Clear Bank Statement Entries (For re-upload)
router.post('/clear', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Unlink bank entries from customer payments
        await client.query(`
            UPDATE customer_payments 
            SET bank_statement_entry_id = NULL 
            WHERE bank_statement_entry_id IS NOT NULL
        `);

        // 2. Truncate bank statement entries
        await client.query('TRUNCATE TABLE bank_statement_entries RESTART IDENTITY CASCADE');

        await client.query('COMMIT');
        res.json({ success: true, message: "Bank statement data cleared successfully." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// [NEW] Get Unconsumed Credits for DSE Smart Select
router.get('/unconsumed-credits', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, bank_ref_id, particulars, credit_amount, consumed_amount, transaction_date
            FROM bank_statement_entries 
            WHERE credit_amount > consumed_amount 
              AND status != 'Exhausted'
            ORDER BY transaction_date DESC, created_at DESC
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// [NEW] Get Unconsumed Debits for Expense/Vendor Payment Smart Select
router.get('/unconsumed-debits', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, bank_ref_id, particulars, debit_amount, consumed_amount, transaction_date
            FROM bank_statement_entries 
            WHERE debit_amount > consumed_amount 
              AND status != 'Exhausted'
            ORDER BY transaction_date DESC, created_at DESC
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// [NEW] Get Detailed Audit View (Reconciliation Details)
router.get('/audit-view', async (req, res) => {
    try {
        const { status, startDate, endDate, search, bank_account_id } = req.query;
        let query = `SELECT * FROM view_bank_statement_details WHERE 1=1`;
        const params = [];

        if (bank_account_id) {
            params.push(bank_account_id);
            query += ` AND bank_account_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND reconciliation_status = $${params.length}`;
        }
        if (startDate && endDate) {
            params.push(startDate, endDate);
            query += ` AND transaction_date BETWEEN $${params.length - 1} AND $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (bank_narration ILIKE $${params.length} OR erp_reference ILIKE $${params.length} OR party_name ILIKE $${params.length} OR user_narration ILIKE $${params.length})`;
        }

        query += ` ORDER BY transaction_date DESC LIMIT 1000`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
