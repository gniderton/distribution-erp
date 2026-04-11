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

// 1.1 List Ledger Options for Selectors (Dynamic Banks + Groups)
router.get('/ledger-options', async (req, res) => {
    try {
        const banksRes = await pool.query('SELECT id, bank_name FROM bank_accounts WHERE is_active = true ORDER BY bank_name');
        
        const options = [
            { label: "💰 All Liquid Assets", value: "group:ALL" },
            { label: "💵 Cash in Hand", value: "group:CASH" },
            { label: "🏦 All Bank Accounts", value: "group:BANKS" },
            { label: "📝 All Cheques", value: "group:CHEQUE" }
        ];

        banksRes.rows.forEach(b => {
            options.push({ label: `🏦 ${b.bank_name}`, value: `bank:${b.id}` });
        });

        res.json(options);
    } catch (err) {
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

// 3. General Ledger (Flattened list of all transaction lines)
router.get('/general-ledger', async (req, res) => {
    try {
        const { start_date, end_date, account_id, reference_type } = req.query;
        let query = `
            SELECT 
                jl.id as line_id,
                je.id as entry_id,
                je.transaction_date,
                je.description,
                je.reference_type,
                je.reference_id,
                coa.code as account_code,
                coa.name as account_name,
                jl.debit,
                jl.credit
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (start_date) {
            query += ` AND je.transaction_date >= $${paramCount++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND je.transaction_date <= $${paramCount++}`;
            params.push(end_date);
        }
        if (account_id) {
            query += ` AND jl.account_id = $${paramCount++}`;
            params.push(account_id);
        }
        if (reference_type) {
            query += ` AND je.reference_type = $${paramCount++}`;
            params.push(reference_type);
        }

        query += ` ORDER BY je.transaction_date DESC, je.id DESC, jl.id ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('General Ledger API Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Ledger Style Statement (Detailed with Opening/Running Balance)
router.get('/statement', async (req, res) => {
    try {
        const { start_date, end_date, bank_account_id, coa_id, group } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: "start_date and end_date are required" });
        }

        let filterSql = "";
        let params = [];
        let pIdx = 1;

        // --- Build Logic for Filters ---
        if (group === 'CASH') {
            filterSql = " AND (coa.code = 1003) ";
        } else if (group === 'CHEQUE') {
            filterSql = " AND (coa.code IN (1004, 2004)) ";
        } else if (group === 'BANKS') {
            filterSql = " AND (coa.code = 1002) ";
        } else if (bank_account_id) {
            const ids = bank_account_id.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            filterSql = ` AND (jl.bank_account_id = ANY($${pIdx++}::bigint[])) `;
            params.push(ids);
        } else if (coa_id) {
            const ids = coa_id.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            filterSql = ` AND (jl.account_id = ANY($${pIdx++}::bigint[])) `;
            params.push(ids);
        } else {
            // Default: "Liquid Assets" (Cash + Banks + Cheques)
            filterSql = " AND (coa.code IN (1002, 1003, 1004, 2004)) ";
        }

        // 1. Calculate Opening Balance (Everything before start_date)
        const openBalQuery = `
            SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as balance
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE je.transaction_date < $${pIdx}
            ${filterSql}
        `;
        const openBalRes = await pool.query(openBalQuery, [...params, start_date]);
        const openingBalance = parseFloat(openBalRes.rows[0].balance);

        // 2. Fetch Transactions (Between start_date and end_date)
        const transQuery = `
            SELECT 
                je.id as entry_id,
                je.transaction_date,
                je.description,
                je.reference_type,
                je.reference_id,
                coa.name as account_name,
                coa.code as account_code,
                jl.debit,
                jl.credit
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE je.transaction_date >= $${pIdx} AND je.transaction_date <= $${pIdx + 1}
            ${filterSql}
            ORDER BY je.transaction_date ASC, je.id ASC, jl.id ASC
        `;
        const transRes = await pool.query(transQuery, [...params, start_date, end_date]);

        // 3. Calculate Running Balance
        let currentBalance = openingBalance;
        const ledger = transRes.rows.map(row => {
            const dr = parseFloat(row.debit || 0);
            const cr = parseFloat(row.credit || 0);
            currentBalance += (dr - cr);
            return {
                ...row,
                balance: currentBalance.toFixed(2)
            };
        });

        res.json({
            opening_balance: openingBalance.toFixed(2),
            closing_balance: currentBalance.toFixed(2),
            transactions: ledger
        });

    } catch (err) {
        console.error('Ledger Statement Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
