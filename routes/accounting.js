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
        
        // Fetch specific COA accounts for Cash/Cheques/Banks
        const coaRes = await pool.query(`
            SELECT id, name, code 
            FROM chart_of_accounts 
            WHERE code IN (1003, 1004, 2004, 1102, 1103) 
            ORDER BY (CASE WHEN code = 1003 THEN 1 WHEN code = 1102 THEN 2 WHEN code = 1103 THEN 3 ELSE 4 END)
        `);

        const options = [
            { label: "💳 Financial Unified (Cash+Banks+Chq)", value: "group:FINANCIAL" },
            { label: "💰 All Liquid Assets", value: "group:ALL" },
            { label: "💵 Cash in Hand", value: "group:CASH" },
            { label: "🏦 All Bank Accounts", value: "group:BANKS" },
            { label: "📝 All Cheques", value: "group:CHEQUE" }
        ];

        // Individual Accounts Section
        coaRes.rows.forEach(c => {
            let icon = '📖';
            if (c.code === 1003) icon = '💵';
            else if (c.code === 1102 || c.code === 1103) icon = '🏦';
            else if (c.code === 1004 || c.code === 2004) icon = '📝';
            options.push({ label: `${icon} ${c.name}`, value: `coa:${c.id}` });
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
        const { start_date, end_date, bank_account_id, coa_id, group, selection } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: "start_date and end_date are required" });
        }

        let filterSql = "";
        let params = [];
        let pIdx = 1;

        // --- Consolidated Selection Logic ---
        // Support for 'selection' param (comma separated list like group:CASH,coa:4453,bank:2)
        const combinedCoaIds = new Set();
        
        const processValue = (val) => {
            if (!val) return;
            const parts = val.split(',');
            parts.forEach(p => {
                const item = p.trim();
                if (item.startsWith('group:')) {
                    const g = item.replace('group:', '');
                    if (g === 'CASH') combinedCoaIds.add(3); // Cash
                    else if (g === 'CHEQUE') { combinedCoaIds.add(1004); combinedCoaIds.add(2004); }
                    else if (g === 'BANKS') { combinedCoaIds.add(4453); combinedCoaIds.add(4454); combinedCoaIds.add(2); } // Axis, IDFC, Bank Account
                    else if (g === 'FINANCIAL' || g === 'ALL') { [3, 4453, 4454, 1004, 2004, 2].forEach(id => combinedCoaIds.add(id)); }
                } else if (item.startsWith('coa:')) {
                    combinedCoaIds.add(parseInt(item.replace('coa:', '')));
                } else if (item.startsWith('bank:')) {
                    const coa_map = { 1: 3, 2: 4453, 3: 4454 };
                    const bId = parseInt(item.replace('bank:', ''));
                    if (coa_map[bId]) combinedCoaIds.add(coa_map[bId]);
                    else combinedCoaIds.add(bId);
                } else {
                    // Raw ID (backwards compatibility)
                    const id = parseInt(item);
                    if (!isNaN(id)) combinedCoaIds.add(id);
                }
            });
        };

        if (selection) processValue(selection);
        if (group) processValue(`group:${group}`);
        if (coa_id) processValue(coa_id.split(',').map(id => `coa:${id}`).join(','));
        if (bank_account_id) processValue(bank_account_id.split(',').map(id => `bank:${id}`).join(','));

        if (combinedCoaIds.size > 0) {
            filterSql = ` AND (jl.account_id = ANY($${pIdx++}::bigint[])) `;
            params.push(Array.from(combinedCoaIds));
        } else {
            // Default: All Liquid (Cash, Banks, Cheques)
            filterSql = " AND (coa.code IN (1102, 1103, 1002, 1003, 1004, 2004)) ";
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
