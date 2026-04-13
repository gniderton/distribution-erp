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

/**
 * [NEW] 1.2 Consolidated Source Transactions (Operational View bypassing Ledger)
 * Aggregates data from 10+ operational tables for a direct bank/cash statement.
 * Optimized for Axis, IDFC, and Cash in Hand reconciliation.
 */
router.get('/source-transactions', async (req, res) => {
    try {
        const { startDateAc, endDateAc, selection } = req.query;

        // Date Normalizer
        const normalizeDate = (dStr) => {
            if (!dStr) return null;
            if (dStr.includes('-')) {
                const parts = dStr.split('-');
                if (parts[0].length === 4) return dStr; // YYYY-MM-DD
                return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY to YYYY-MM-DD
            }
            return dStr;
        };

        const start = normalizeDate(startDateAc) || '1970-01-01';
        const end = normalizeDate(endDateAc) || '2099-12-31';

        // Filter Logic (Selection Parsing)
        const combinedBankIds = new Set();
        const combinedCoaIds = new Set();

        const processValue = (val) => {
            if (!val) return;
            const parts = val.split(',');
            parts.forEach(p => {
                const [type, id] = p.trim().split(':');
                if (type === 'bank') combinedBankIds.add(parseInt(id));
                if (type === 'coa') combinedCoaIds.add(parseInt(id));
                if (type === 'group') {
                    if (id === 'CASH') combinedBankIds.add(1);
                    if (id === 'BANKS' || id === 'BANK') { combinedBankIds.add(2); combinedBankIds.add(3); }
                    if (id === 'CHEQUE') combinedCoaIds.add(1004); // Cheques in Hand
                }
            });
        };

        processValue(selection);

        // SQL Construction: UNION ALL across operational sources
        const query = `
            WITH all_raw_transactions AS (
                -- 1. Customer Payments
                SELECT 
                    id, payment_date as date, 'Customer Payment' as type, payment_mode as mode,
                    (SELECT customer_name FROM customers WHERE id = customer_id) as details,
                    transaction_ref as reference, 
                    CASE 
                        WHEN payment_mode = 'Cheque' THEN 1004 -- Cheques In Hand
                        ELSE COALESCE(bank_id, 1) -- Cash or Specific Bank
                    END as account_id,
                    amount as inflow, 0 as outflow, 'public.customer_payments' as source_table
                FROM customer_payments
                WHERE is_active = true 
                AND (bank_statement_entry_id IS NOT NULL OR payment_date >= '2026-04-01')

                UNION ALL

                -- 2. Vendor Payments
                SELECT 
                    id, payment_date as date, 'Vendor Payment' as type, payment_mode as mode,
                    (SELECT vendor_name FROM vendors WHERE id = vendor_id) as details,
                    transaction_ref as reference, bank_account_id as account_id,
                    0 as inflow, amount as outflow, 'public.vendor_payments' as source_table
                FROM vendor_payments
                WHERE bank_statement_entry_id IS NOT NULL OR payment_date >= '2026-04-01'

                UNION ALL

                -- 3. Expenses
                SELECT 
                    id, expense_date as date, 'Expense' as type, 'BANK' as mode,
                    description as details, reference_no as reference, payment_source_id as account_id,
                    0 as inflow, grand_total as outflow, 'public.expenses' as source_table
                FROM expenses
                WHERE bank_statement_entry_id IS NOT NULL OR expense_date >= '2026-04-01'

                UNION ALL

                -- 4. Other Income
                SELECT 
                    id, transaction_date as date, 'Other Income' as type, 'BANK' as mode,
                    description as details, reference_no as reference, destination_account_id as account_id,
                    amount as inflow, 0 as outflow, 'public.other_income' as source_table
                FROM other_income

                UNION ALL

                -- 5. Internal Transfers (Outflow Line)
                SELECT 
                    id, transfer_date as date, 'Transfer (Out)' as type, 'BANK' as mode,
                    remarks as details, 'TFR-' || id as reference, from_account_id as account_id,
                    0 as inflow, amount as outflow, 'public.internal_transfers' as source_table
                FROM internal_transfers

                UNION ALL

                -- 6. Internal Transfers (Inflow Line)
                SELECT 
                    id, transfer_date as date, 'Transfer (In)' as type, 'BANK' as mode,
                    remarks as details, 'TFR-' || id as reference, to_account_id as account_id,
                    amount as inflow, 0 as outflow, 'public.internal_transfers' as source_table
                FROM internal_transfers

                UNION ALL

                -- 7. Employee Advances/Salaries
                SELECT 
                    id, advance_date as date, 'Payroll' as type, 'BANK' as mode,
                    (SELECT full_name FROM employees WHERE id = employee_id) as details,
                    'PAY-' || id as reference, from_account_id as account_id,
                    0 as inflow, amount as outflow, 'public.employee_advances' as source_table
                FROM employee_advances

                UNION ALL

                -- 8. Loan Transactions
                SELECT 
                    lt.id, lt.transaction_date as date, 'Loan' as type, lt.payment_mode as mode,
                    l.party_name || ' (' || lt.transaction_type || ')' as details,
                    lt.reference_no as reference, 
                    COALESCE(
                        (SELECT bank_account_id FROM bank_statement_entries WHERE id = lt.bank_statement_entry_id),
                        (SELECT id FROM bank_accounts WHERE bank_name ILIKE '%axis%' LIMIT 1),
                        2
                    ) as account_id, 
                    CASE 
                        WHEN (l.loan_type = 'TAKEN' AND lt.transaction_type = 'DISBURSEMENT') OR (l.loan_type = 'GIVEN' AND lt.transaction_type = 'INSTALLMENT') THEN lt.amount 
                        ELSE 0 
                    END as inflow,
                    CASE 
                        WHEN (l.loan_type = 'GIVEN' AND lt.transaction_type = 'DISBURSEMENT') OR (l.loan_type = 'TAKEN' AND lt.transaction_type = 'INSTALLMENT') THEN lt.amount 
                        ELSE 0 
                    END as outflow,
                    'public.loan_transactions' as source_table
                FROM loan_transactions lt
                JOIN loans l ON lt.loan_id = l.id

                UNION ALL

                -- 9. Asset Transactions (Linked via Journal)
                SELECT 
                    at.id, at.transaction_date as date, 'Asset Transaction' as type, 'BANK' as mode,
                    at.remarks as details, 'AST-' || at.id as reference,
                    CAST(COALESCE(jl.bank_account_id, (SELECT id FROM chart_of_accounts WHERE id = jl.account_id)) as bigint) as account_id,
                    CAST(COALESCE(jl.credit, 0) as numeric) as inflow,
                    CAST(COALESCE(jl.debit, 0) as numeric) as outflow,
                    'public.asset_transactions' as source_table
                FROM asset_transactions at
                JOIN journal_lines jl ON at.journal_entry_id = jl.journal_entry_id
                WHERE (jl.bank_account_id IS NOT NULL OR jl.account_id IN (1002, 1003, 1004, 1102, 1103))

                UNION ALL

                -- 10. Cheques 
                -- (Entered -> Account 1004 'Cheques in Hand')
                -- (Cleared -> Individual Bank Account)
                SELECT 
                    id, cheque_date as date, 'Cheque' as type, 'CHEQUE' as mode,
                    (party_type || ': ' || party_id) as details,
                    cheque_number as reference,
                    CASE WHEN status = 'Cleared' THEN bank_account_id ELSE 1004 END as account_id,
                    CASE WHEN type = 'Received' THEN amount ELSE 0 END as inflow,
                    CASE WHEN type = 'Issued' THEN amount ELSE 0 END as outflow,
                    'public.cheques' as source_table
                FROM cheques

                UNION ALL

                -- 11. Ledger-Based Bank/Cash Movements (Cheque Clearances, etc)
                SELECT 
                    je.id, je.transaction_date as date, 'Cheque Cleared' as type, 'JOURNAL' as mode,
                    je.description as details, 'JE-' || je.id as reference,
                    CAST(COALESCE(jl.bank_account_id, (CASE WHEN jl.account_id IN (3, 1004) THEN jl.account_id ELSE NULL END)) as bigint) as account_id,
                    jl.debit as inflow, jl.credit as outflow, 'public.journal_lines' as source_table
                FROM journal_lines jl
                JOIN journal_entries je ON jl.journal_entry_id = je.id
                WHERE (je.reference_type = 'CHQ_CLEAR' OR je.reference_type = 'BANK_STMT')
                AND (jl.bank_account_id IS NOT NULL OR jl.account_id IN (3, 1004))
            )
            SELECT * FROM all_raw_transactions
            WHERE date >= $1 AND date <= $2
            AND (
                account_id = ANY($3::bigint[]) -- Matches bank_account_id
                OR (account_id = ANY($4::bigint[]) OR account_id = ANY(SELECT id FROM chart_of_accounts WHERE id = ANY($4::bigint[]))) -- Matches COA ID
            )
            ORDER BY date ASC, id ASC
        `;

        const bankArr = Array.from(combinedBankIds);
        const coaArr = Array.from(combinedCoaIds);

        // Selection Defaults: If everything is empty, show Liquid (Cash+Banks)
        const finalBankArr = (bankArr.length === 0 && coaArr.length === 0) ? [1, 2, 3] : bankArr;
        const finalCoaArr = coaArr.length > 0 ? coaArr : [-1];

        // 1. Fetch Opening Balance (Sum before start date)
        const openRes = await pool.query(`
            WITH source_data AS ( ${query} )
            SELECT COALESCE(SUM(inflow - outflow), 0) as balance 
            FROM source_data 
            WHERE date < $1 AND (
                account_id = ANY($3::bigint[]) 
                OR (account_id = ANY($4::bigint[]) OR account_id = ANY(SELECT id FROM chart_of_accounts WHERE id = ANY($4::bigint[])))
            )
        `, [start, end, finalBankArr, finalCoaArr]);
        const openingBalance = parseFloat(openRes.rows[0].balance);

        // 2. Fetch Detailed Transactions (Between start and end)
        const result = await pool.query(`
            WITH source_data AS ( ${query} )
            SELECT * FROM source_data
            WHERE date >= $1 AND date <= $2
            AND (
                account_id = ANY($3::bigint[]) 
                OR (account_id = ANY($4::bigint[]) OR account_id = ANY(SELECT id FROM chart_of_accounts WHERE id = ANY($4::bigint[])))
            )
            ORDER BY date ASC, id ASC
        `, [start, end, finalBankArr, finalCoaArr]);
        
        // Return both for Appsmith math
        res.json({
            opening_balance: openingBalance.toFixed(2),
            transactions: result.rows
        });

    } catch (err) {
        console.error('Source Transaction API Error:', err.message);
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
        let { start_date, end_date, bank_account_id, coa_id, group, selection } = req.query;
        
        // Helper to handle DD-MM-YYYY format
        const ensureIsoDate = (d) => {
            if (!d) return d;
            if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
                const [day, month, year] = d.split('-');
                return `${year}-${month}-${day}`;
            }
            return d;
        };

        start_date = ensureIsoDate(start_date);
        end_date = ensureIsoDate(end_date);
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: "start_date and end_date are required" });
        }

        let filterSql = "";
        let params = [];
        let pIdx = 1;

        // --- Consolidated Selection Logic ---
        // Support for 'selection' param (comma separated list like group:CASH,coa:4453,bank:2)
        const combinedCoaIds = new Set();
        const combinedBankIds = new Set();
        
        const processValue = (val) => {
            if (!val) return;
            const parts = val.split(',');
            parts.forEach(p => {
                const item = p.trim();
                if (item.startsWith('group:')) {
                    const g = item.replace('group:', '');
                    if (g === 'CASH') { 
                        combinedCoaIds.add(3); 
                        combinedBankIds.add(1); 
                    } else if (g === 'CHEQUE') { 
                        combinedCoaIds.add(1004); 
                        combinedCoaIds.add(2004); 
                    } else if (g === 'BANKS') { 
                        [4453, 4454, 2].forEach(id => combinedCoaIds.add(id)); 
                        [2, 3].forEach(id => combinedBankIds.add(id)); 
                    } else if (g === 'FINANCIAL' || g === 'ALL') { 
                        [3, 4453, 4454, 1004, 2004, 2].forEach(id => combinedCoaIds.add(id)); 
                        [1, 2, 3].forEach(id => combinedBankIds.add(id)); 
                    }
                } else if (item.startsWith('coa:')) {
                    combinedCoaIds.add(parseInt(item.replace('coa:', '')));
                } else if (item.startsWith('bank:')) {
                    const bId = parseInt(item.replace('bank:', ''));
                    combinedBankIds.add(bId);
                    // Bridge: Fallback to COA mapping for older entries without bank_account_id
                    const coa_map = { 1: 3, 2: 4453, 3: 4454 };
                    if (coa_map[bId]) combinedCoaIds.add(coa_map[bId]);
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

        if (combinedCoaIds.size > 0 || combinedBankIds.size > 0) {
            const coaArr = Array.from(combinedCoaIds);
            const bankArr = Array.from(combinedBankIds);
            filterSql = ` AND (jl.account_id = ANY($${pIdx++}::bigint[]) OR jl.bank_account_id = ANY($${pIdx++}::bigint[])) `;
            params.push(coaArr, bankArr);
        } else {
            // Default: All Liquid (Cash, Banks, Cheques)
            filterSql = " AND (coa.code IN (1102, 1103, 1002, 1003, 1004, 2004) OR jl.bank_account_id IN (1, 2, 3)) ";
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
