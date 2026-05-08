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

/**
 * [NEW] 1.2 Consolidated Source Transactions (Operational View bypassing Ledger)
 */
router.get('/source-transactions', async (req, res) => {
    try {
        const { startDateAc, endDateAc, selection } = req.query;
        const startDate = normalizeDate(startDateAc) || '1970-01-01';
        const endDate = normalizeDate(endDateAc) || '2099-12-31';

        const combinedBankIds = new Set();
        const combinedCoaIds = new Set();

        const processValue = (val) => {
            if (!val) return;
            const parts = val.split(',');
            parts.forEach(p => {
                const item = p.trim();
                const [type, id] = item.split(':');
                if (type === 'bank') combinedBankIds.add(parseInt(id));
                else if (type === 'coa') combinedCoaIds.add(parseInt(id));
                else if (type === 'group') {
                    if (id === 'CASH') combinedBankIds.add(1);
                    if (id === 'BANKS' || id === 'BANK') { combinedBankIds.add(2); combinedBankIds.add(3); }
                    if (id === 'CHEQUE') combinedCoaIds.add(1004);
                } else {
                    const numId = parseInt(item);
                    if (!isNaN(numId)) combinedCoaIds.add(numId);
                }
            });
        };

        processValue(selection);

        const query = `
            WITH all_raw_transactions AS (
                SELECT id, payment_date as date, 'Customer Payment' as type, payment_mode as mode,
                    (SELECT customer_name FROM customers WHERE id = customer_id) as details,
                    transaction_ref as reference, CASE WHEN payment_mode = 'Cheque' THEN 1004 ELSE COALESCE(bank_id, 1) END as account_id,
                    amount as inflow, 0 as outflow, 'public.customer_payments' as source_table
                FROM customer_payments WHERE is_active = true AND (bank_statement_entry_id IS NOT NULL OR payment_date >= '2026-04-01')
                UNION ALL
                SELECT id, payment_date as date, 'Vendor Payment' as type, payment_mode as mode,
                    (SELECT vendor_name FROM vendors WHERE id = vendor_id) as details,
                    transaction_ref as reference, bank_account_id as account_id, 0 as inflow, amount as outflow, 'public.vendor_payments' as source_table
                FROM vendor_payments WHERE bank_statement_entry_id IS NOT NULL OR payment_date >= '2026-04-01'
                UNION ALL
                SELECT id, expense_date as date, 'Expense' as type, 'BANK' as mode,
                    description as details, reference_no as reference, payment_source_id as account_id, 0 as inflow, grand_total as outflow, 'public.expenses' as source_table
                FROM expenses WHERE bank_statement_entry_id IS NOT NULL OR expense_date >= '2026-04-01'
                UNION ALL
                SELECT id, transaction_date as date, 'Other Income' as type, 'BANK' as mode,
                    description as details, reference_no as reference, destination_account_id as account_id, amount as inflow, 0 as outflow, 'public.other_income' as source_table
                FROM other_income
                UNION ALL
                SELECT id, transfer_date as date, 'Transfer (Out)' as type, 'BANK' as mode,
                    remarks as details, 'TFR-' || id as reference, from_account_id as account_id, 0 as inflow, amount as outflow, 'public.internal_transfers' as source_table
                FROM internal_transfers
                UNION ALL
                SELECT id, transfer_date as date, 'Transfer (In)' as type, 'BANK' as mode,
                    remarks as details, 'TFR-' || id as reference, to_account_id as account_id, amount as inflow, 0 as outflow, 'public.internal_transfers' as source_table
                FROM internal_transfers
                UNION ALL
                SELECT id, advance_date as date, 'Payroll' as type, 'BANK' as mode,
                    (SELECT full_name FROM employees WHERE id = employee_id) as details,
                    'PAY-' || id as reference, from_account_id as account_id, 0 as inflow, amount as outflow, 'public.employee_advances' as source_table
                FROM employee_advances
                UNION ALL
                SELECT lt.id, lt.transaction_date as date, 'Loan' as type, lt.payment_mode as mode,
                    l.party_name || ' (' || lt.transaction_type || ')' as details,
                    lt.reference_no as reference, COALESCE((SELECT bank_account_id FROM bank_statement_entries WHERE id = lt.bank_statement_entry_id), 2) as account_id, 
                    CASE WHEN (l.loan_type = 'TAKEN' AND lt.transaction_type = 'DISBURSEMENT') OR (l.loan_type = 'GIVEN' AND lt.transaction_type = 'INSTALLMENT') THEN lt.amount ELSE 0 END as inflow,
                    CASE WHEN (l.loan_type = 'GIVEN' AND lt.transaction_type = 'DISBURSEMENT') OR (l.loan_type = 'TAKEN' AND lt.transaction_type = 'INSTALLMENT') THEN lt.amount ELSE 0 END as outflow,
                    'public.loan_transactions' as source_table
                FROM loan_transactions lt JOIN loans l ON lt.loan_id = l.id WHERE lt.bank_statement_entry_id IS NOT NULL AND lt.payment_mode != 'MIGRATION'
                UNION ALL
                SELECT at.id, at.transaction_date as date, 'Asset Transaction' as type, 'BANK' as mode,
                    at.remarks as details, 'AST-' || at.id as reference, CAST(COALESCE(jl.bank_account_id, (SELECT id FROM chart_of_accounts WHERE id = jl.account_id)) as bigint) as account_id,
                    CAST(COALESCE(jl.credit, 0) as numeric) as inflow, CAST(COALESCE(jl.debit, 0) as numeric) as outflow, 'public.asset_transactions' as source_table
                FROM asset_transactions at JOIN journal_lines jl ON at.journal_entry_id = jl.journal_entry_id
                WHERE (jl.bank_account_id IS NOT NULL OR jl.account_id IN (1002, 1003, 1004, 1102, 1103))
                UNION ALL
                SELECT id, cheque_date as date, 'Cheque' as type, 'CHEQUE' as mode,
                    (party_type || ': ' || party_id) as details, cheque_number as reference,
                    CASE WHEN status = 'Cleared' THEN bank_account_id ELSE 1004 END as account_id,
                    CASE WHEN type = 'Received' THEN amount ELSE 0 END as inflow, CASE WHEN type = 'Issued' THEN amount ELSE 0 END as outflow,'public.cheques' as source_table
                FROM cheques
                UNION ALL
                SELECT je.id, je.transaction_date as date, 'Cheque Cleared' as type, 'JOURNAL' as mode,
                    je.description as details, 'JE-' || je.id as reference, CAST(COALESCE(jl.bank_account_id, (CASE WHEN jl.account_id IN (3, 1004) THEN jl.account_id ELSE NULL END)) as bigint) as account_id,
                    jl.debit as inflow, jl.credit as outflow, 'public.journal_lines' as source_table
                FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id
                WHERE (je.reference_type = 'CHQ_CLEAR' OR je.reference_type = 'BANK_STMT') AND (jl.bank_account_id IS NOT NULL OR jl.account_id IN (3, 1004))
            )
            SELECT * FROM all_raw_transactions WHERE date >= $1 AND date <= $2
            AND (account_id = ANY($3::bigint[]) OR (account_id = ANY($4::bigint[]) OR account_id = ANY(SELECT id FROM chart_of_accounts WHERE id = ANY($4::bigint[]))))
            ORDER BY date ASC, id ASC
        `;

        const bankArr = Array.from(combinedBankIds);
        const coaArr = Array.from(combinedCoaIds);
        const finalBankArr = (bankArr.length === 0 && coaArr.length === 0) ? [1, 2, 3] : bankArr;
        const finalCoaArr = coaArr.length > 0 ? coaArr : [-1];

        const openRes = await pool.query(`
            WITH source_data AS ( ${query} )
            SELECT COALESCE(SUM(inflow - outflow), 0) as balance 
            FROM source_data WHERE date < $1 AND (account_id = ANY($3::bigint[]) OR (account_id = ANY($4::bigint[]) OR account_id = ANY(SELECT id FROM chart_of_accounts WHERE id = ANY($4::bigint[]))))
        `, [startDate, endDate, finalBankArr, finalCoaArr]);
        const openingBalance = parseFloat(openRes.rows[0].balance);

        const result = await pool.query(query, [startDate, endDate, finalBankArr, finalCoaArr]);
        res.json({ opening_balance: openingBalance.toFixed(2), transactions: result.rows });
    } catch (err) {
        console.error('Source Transaction API Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * [NEW] 1.3 Unified Liquid Ledger (Forensic Engine)
 */
router.get('/unified-liquid-ledger', async (req, res) => {
    try {
        let { start_date, end_date, liquid_account_id, bank_account_id, account_filter } = req.query;

        // 🛡️ Universal Filter Mapping (Appsmith Simplified)
        if (account_filter) {
            if (account_filter === 'UNIFIED') liquid_account_id = '1002';
            else if (account_filter === 'CASH') liquid_account_id = '1';
            else if (account_filter === 'AXIS') bank_account_id = '2';
            else if (account_filter === 'IDFC') bank_account_id = '3';
        }

        // 🛡️ Appsmith Resilience: Treat empty strings as undefined
        if (liquid_account_id === '') liquid_account_id = undefined;
        if (bank_account_id === '') bank_account_id = undefined;

        if (!liquid_account_id && !bank_account_id) {
            return res.status(400).json({ error: "liquid_account_id, bank_account_id, or account_filter is required" });
        }

        const targetAccountId = bank_account_id ? 1002 : liquid_account_id;

        // 🛡️ PARTITIONED FILTERING: sequential parameters $1, $2, etc.
        let accountFilterSql = "";
        let filterParams = [];

        if (bank_account_id) {
            accountFilterSql = `(v.direct_bank_id = $1 OR bse.bank_account_id = $1)`;
            filterParams.push(bank_account_id);
        } else {
            accountFilterSql = `v.liquid_account_id = $1`;
            filterParams.push(targetAccountId);
        }

        // 🛡️ STAGE 1: THE MIGRATION ANCHOR (Seed)
        let anchorQuery = "";
        let anchorParams = [];
        if (bank_account_id) {
            anchorQuery = `SELECT SUM(amount) as seed FROM opening_balances WHERE account_id = $1 AND is_active = true`;
            anchorParams = [bank_account_id];
        } else {
            anchorQuery = `SELECT SUM(amount) as seed FROM opening_balances WHERE account_id = $1 AND is_active = true`;
            anchorParams = [targetAccountId];
        }
        const anchorRes = await pool.query(anchorQuery, anchorParams);
        const seedBalance = parseFloat(anchorRes.rows[0].seed || 0);

        // 🛡️ STAGE 2: THE HISTORICAL INTEGRAL (Sum of movements strictly BEFORE start_date)
        let historicalIntegral = 0;
        if (start_date) {
            let openingQuery = `
                SELECT COALESCE(SUM(amount_in - amount_out), 0) as integral 
                FROM view_unified_liquid_ledger v LEFT JOIN bank_statement_entries bse ON v.bank_statement_entry_id = bse.id
                WHERE ${accountFilterSql} AND v.trans_date::DATE < $${filterParams.length + 1}::DATE
            `;
            const openingParams = [...filterParams, start_date];
            const openingRes = await pool.query(openingQuery, openingParams);
            historicalIntegral = parseFloat(openingRes.rows[0].integral);
        }
        
        // 🛡️ FINAL RESULT: Anchor + Integral
        const openingBalance = seedBalance + historicalIntegral;

        let queryMain = `
            SELECT v.* FROM view_unified_liquid_ledger v LEFT JOIN bank_statement_entries bse ON v.bank_statement_entry_id = bse.id
            WHERE ${accountFilterSql}
        `;
        const paramsMain = [...filterParams];
        if (start_date) { 
            paramsMain.push(start_date); 
            queryMain += ` AND v.trans_date::DATE >= $${paramsMain.length}::DATE`; 
        }
        if (end_date) { 
            paramsMain.push(end_date); 
            queryMain += ` AND v.trans_date::DATE <= $${paramsMain.length}::DATE`; 
        }

        queryMain += ` ORDER BY v.trans_date ASC, v.source_id ASC`;
        const result = await pool.query(queryMain, paramsMain);

        let currentBalance = openingBalance;
        const transactions = result.rows.map(row => {
            currentBalance += parseFloat(row.amount_in || 0);
            currentBalance -= parseFloat(row.amount_out || 0);
            return { 
                ...row, 
                amount_in: parseFloat(row.amount_in || 0).toFixed(2),
                amount_out: parseFloat(row.amount_out || 0).toFixed(2),
                running_balance: parseFloat(currentBalance.toFixed(2)) 
            };
        });

        res.json({ 
            opening_balance: parseFloat(openingBalance.toFixed(2)), 
            closing_balance: parseFloat(currentBalance.toFixed(2)), 
            transactions: transactions 
        });
    } catch (err) {
        console.error('Unified Ledger Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Single Journal Entry with Lines
router.get('/journal-entries/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const headerRes = await pool.query(`SELECT * FROM journal_entries WHERE id = $1`, [id]);
        if (headerRes.rows.length === 0) return res.status(404).json({ error: "Journal entry not found" });
        const linesRes = await pool.query(`
            SELECT jl.id, jl.account_id, coa.code as account_code, coa.name as account_name, jl.debit, jl.credit
            FROM journal_lines jl JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE jl.journal_entry_id = $1 ORDER BY jl.debit DESC, jl.id ASC
        `, [id]);
        res.json({ ...headerRes.rows[0], lines: linesRes.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 3. General Ledger
router.get('/general-ledger', async (req, res) => {
    try {
        const { start_date, end_date, account_id, reference_type } = req.query;
        let query = `
            SELECT jl.id as line_id, je.id as entry_id, je.transaction_date, je.description, je.reference_type, je.reference_id, coa.code as account_code, coa.name as account_name, jl.debit, jl.credit
            FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE 1=1
        `;
        const params = [];
        let pCt = 1;
        if (start_date) { query += ` AND je.transaction_date >= $${pCt++}`; params.push(start_date); }
        if (end_date) { query += ` AND je.transaction_date <= $${pCt++}`; params.push(end_date); }
        if (account_id) { query += ` AND jl.account_id = $${pCt++}`; params.push(account_id); }
        if (reference_type) { query += ` AND je.reference_type = $${pCt++}`; params.push(reference_type); }
        query += ` ORDER BY je.transaction_date DESC, je.id DESC, jl.id ASC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('General Ledger Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Ledger Style Statement
router.get('/statement', async (req, res) => {
    try {
        let { start_date, end_date, selection } = req.query;
        const ensureIsoDate = (d) => { if (!d) return d; if (/^\d{2}-\d{2}-\d{4}$/.test(d)) { const [day, month, year] = d.split('-'); return `${year}-${month}-${day}`; } return d; };
        start_date = ensureIsoDate(start_date); end_date = ensureIsoDate(end_date);
        if (!start_date || !end_date) return res.status(400).json({ error: "start_date and end_date are required" });

        const combinedCoaIds = new Set();
        const combinedBankIds = new Set();
        const processValue = (val) => {
            if (!val) return;
            val.split(',').forEach(p => {
                const item = p.trim();
                if (item.startsWith('group:')) {
                    const g = item.replace('group:', '');
                    if (g === 'CASH') { combinedCoaIds.add(3); combinedBankIds.add(1); }
                    else if (g === 'CHEQUE') { combinedCoaIds.add(1004); combinedCoaIds.add(2004); }
                    else if (g === 'BANKS') { [4453, 4454, 2].forEach(id => combinedCoaIds.add(id)); [2, 3].forEach(id => combinedBankIds.add(id)); }
                    else if (g === 'FINANCIAL' || g === 'ALL') { [3, 4453, 4454, 1004, 2004, 2].forEach(id => combinedCoaIds.add(id)); [1, 2, 3].forEach(id => combinedBankIds.add(id)); }
                } else if (item.startsWith('coa:')) combinedCoaIds.add(parseInt(item.replace('coa:', '')));
                else if (item.startsWith('bank:')) {
                    const bId = parseInt(item.replace('bank:', ''));
                    combinedBankIds.add(bId);
                    const coa_map = { 1: 3, 2: 4453, 3: 4454 }; if (coa_map[bId]) combinedCoaIds.add(coa_map[bId]);
                } else { const id = parseInt(item); if (!isNaN(id)) combinedCoaIds.add(id); }
            });
        };
        processValue(selection);
        let filterSql = "";
        let params = [];
        let pIdx = 1;
        if (combinedCoaIds.size > 0 || combinedBankIds.size > 0) {
            filterSql = ` AND (jl.account_id = ANY($${pIdx++}::bigint[]) OR jl.bank_account_id = ANY($${pIdx++}::bigint[])) `;
            params.push(Array.from(combinedCoaIds), Array.from(combinedBankIds));
        } else filterSql = " AND (coa.code IN (1102, 1103, 1002, 1003, 1004, 2004) OR jl.bank_account_id IN (1, 2, 3)) ";

        const openBalRes = await pool.query(`SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as balance FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE je.transaction_date < $${pIdx} ${filterSql}`, [...params, start_date]);
        const openingBalance = parseFloat(openBalRes.rows[0].balance);

        const transRes = await pool.query(`SELECT je.id as entry_id, je.transaction_date, je.description, je.reference_type, je.reference_id, coa.name as account_name, coa.code as account_code, jl.debit, jl.credit FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE je.transaction_date >= $${pIdx} AND je.transaction_date <= $${pIdx + 1} ${filterSql} ORDER BY je.transaction_date ASC, je.id ASC, jl.id ASC`, [...params, start_date, end_date]);

        let currentBalance = openingBalance;
        const ledger = transRes.rows.map(row => { currentBalance += (parseFloat(row.debit || 0) - parseFloat(row.credit || 0)); return { ...row, balance: currentBalance.toFixed(2) }; });
        res.json({ opening_balance: openingBalance.toFixed(2), closing_balance: currentBalance.toFixed(2), transactions: ledger });
    } catch (err) {
        console.error('Ledger Statement Error:', err);
        res.status(500).json({ error: err.message });
    }
});


/**
 * [NEW] 5. Forensic Financial Summary (The "Brain" API)
 * Aggregates all databases: Expenses, Income, Salaries, Advances, Bonuses, Receivables, Payables, Loans, Assets, Stock.
 */
router.get('/forensic-snapshot', async (req, res) => {
    try {
        const queries = {
            // 1. LIQUIDITY & ACCOUNTS (Forensic Accuracy)
            accounts: `
                WITH account_seeds AS (
                    SELECT account_id, SUM(amount) as seed
                    FROM opening_balances
                    WHERE is_active = true
                    GROUP BY account_id
                ),
                account_movements AS (
                    SELECT 
                        CASE 
                            WHEN source_table = 'cheques' THEN 1004
                            WHEN direct_bank_id IS NOT NULL THEN direct_bank_id
                            ELSE liquid_account_id
                        END as acc_id,
                        SUM(amount_in - amount_out) as movement
                    FROM view_unified_liquid_ledger
                    GROUP BY 1
                )
                SELECT 
                    'Bank/Cash' as category, 
                    b.bank_name as name, 
                    (COALESCE(s.seed, 0) + COALESCE(m.movement, 0)) as balance, 
                    'ASSET' as type
                FROM bank_accounts b
                LEFT JOIN account_seeds s ON s.account_id = b.id
                LEFT JOIN account_movements m ON m.acc_id = b.id
                WHERE b.is_active = true
                UNION ALL
                SELECT 
                    'Cheques' as category, 
                    'Cheques in Hand' as name, 
                    (COALESCE((SELECT seed FROM account_seeds WHERE account_id = 1004), 0) + 
                     COALESCE((SELECT movement FROM account_movements WHERE acc_id = 1004), 0)) as balance, 
                    'ASSET' as type
                UNION ALL
                SELECT 
                    'Cash' as category, 
                    'Cash in Hand' as name, 
                    (COALESCE((SELECT seed FROM account_seeds WHERE account_id = 1), 0) + 
                     COALESCE((SELECT movement FROM account_movements WHERE acc_id = 1), 0)) as balance, 
                    'ASSET' as type
            `,

            // 2. RECEIVABLES (Logic from dse-pending-invoices)
            receivables: `
                SELECT 
                    c.customer_name as party,
                    COUNT(si.id) as pending_bills,
                    SUM(si.grand_total - 
                        COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) -
                        COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0)
                    ) as balance
                FROM sales_invoices si
                JOIN customers c ON si.customer_id = c.id
                WHERE si.status NOT IN ('Paid', 'Cancelled')
                GROUP BY c.customer_name
                HAVING SUM(si.grand_total - 
                    COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) -
                    COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0)
                ) > 0
            `,

            // 3. PAYABLES (Vendor Ledger logic)
            payables: `
                SELECT 
                    v.vendor_name as party,
                    SUM(vl.credit_amount - vl.debit_amount) as balance
                FROM view_vendor_ledger vl
                JOIN vendors v ON vl.vendor_id = v.id
                GROUP BY v.vendor_name
                HAVING SUM(vl.credit_amount - vl.debit_amount) > 0
            `,

            // 4. EXPENSES (By Category)
            expenses: `
                SELECT coa.name as category, SUM(e.grand_total) as amount
                FROM expenses e
                JOIN chart_of_accounts coa ON e.category_account_id = coa.id
                WHERE e.is_active = true
                GROUP BY coa.name
            `,

            // 5. OTHER INCOME
            income: `
                SELECT coa.name as category, SUM(oi.amount) as amount
                FROM other_income oi
                JOIN chart_of_accounts coa ON oi.category_account_id = coa.id
                WHERE oi.is_active = true
                GROUP BY coa.name
            `,

            // 6. PAYROLL (Salaries + Advances + Bonuses)
            payroll: `
                SELECT 
                    'Salaries Paid' as type, SUM(net_salary) as amount FROM employee_salaries
                UNION ALL
                SELECT 
                    'Advances Outstanding' as type, SUM(amount) FROM employee_advances WHERE is_settled = false
                UNION ALL
                SELECT 
                    'Incentives/Bonuses' as type, SUM(points * 1) as amount FROM performance_points_history -- Assuming 1 pt = 1 unit for now
            `,

            // 7. LOANS
            loans: `
                SELECT party_name, loan_type, balance_principal as balance, status
                FROM loans WHERE status != 'Closed'
            `,

            // 8. ASSETS
            assets: `
                SELECT asset_name, category, purchase_cost, status
                FROM assets WHERE status = 'Active'
            `,

            // 9. STOCK VALUATION
            stock: `
                SELECT 
                    p.product_name,
                    SUM(ib.quantity_remaining) as stock_qty,
                    SUM(ib.quantity_remaining * ib.purchase_rate) as valuation
                FROM inventory_batches ib
                JOIN products p ON ib.product_id = p.id
                WHERE ib.quantity_remaining > 0
                GROUP BY p.product_name
            `
        };

        const results = {};
        const queryKeys = Object.keys(queries);

        for (const key of queryKeys) {
            const res = await pool.query(queries[key]);
            results[key] = res.rows;
        }

        // Summary Calculations
        const totalReceivables = results.receivables.reduce((sum, r) => sum + parseFloat(r.balance || 0), 0);
        const totalPayables = results.payables.reduce((sum, p) => sum + parseFloat(p.balance || 0), 0);
        const totalCashBank = results.accounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);
        const totalStock = results.stock.reduce((sum, s) => sum + parseFloat(s.valuation || 0), 0);
        const totalAssets = results.assets.reduce((sum, a) => sum + parseFloat(a.purchase_cost || 0), 0);
        const totalLoansGiven = results.loans.filter(l => l.loan_type === 'GIVEN').reduce((sum, l) => sum + parseFloat(l.balance || 0), 0);
        const totalLoansTaken = results.loans.filter(l => l.loan_type === 'TAKEN').reduce((sum, l) => sum + parseFloat(l.balance || 0), 0);

        results.summary = {
            total_assets: (totalCashBank + totalReceivables + totalStock + totalAssets + totalLoansGiven).toFixed(2),
            total_liabilities: (totalPayables + totalLoansTaken).toFixed(2),
            net_capital: (
                (totalCashBank + totalReceivables + totalStock + totalAssets + totalLoansGiven) - 
                (totalPayables + totalLoansTaken)
            ).toFixed(2),
            breakdown: {
                cash_bank: totalCashBank.toFixed(2),
                receivables: totalReceivables.toFixed(2),
                stock_value: totalStock.toFixed(2),
                fixed_assets: totalAssets.toFixed(2),
                payables: totalPayables.toFixed(2),
                loans_taken: totalLoansTaken.toFixed(2),
                loans_given: totalLoansGiven.toFixed(2)
            }
        };

        res.json(results);
    } catch (err) {
        console.error('Forensic Snapshot Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

