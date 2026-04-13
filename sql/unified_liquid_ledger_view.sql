-- 🛡️ Unified Liquid Ledger Forensic View
-- Consolidates 14 sources into a single stream of truth

CREATE OR REPLACE VIEW view_unified_liquid_ledger AS
-- 1. Customer Payments (Verified Only, Exclude Migration)
SELECT 
    payment_date as trans_date,
    'CUSTOMER: ' || cp.id as party_name,
    'Collection' as description,
    amount as amount_in,
    0 as amount_out,
    COALESCE(bank_id, 1) as liquid_account_id, -- Default to Cash (1)
    'customer_payments' as source_table,
    id as source_id,
    bank_statement_entry_id
FROM customer_payments cp
WHERE verification_status = 'Verified' 
  AND payment_number IS NOT NULL
  AND payment_mode != 'CHEQUE' -- Cheques are handled via the Cheque Repository

UNION ALL

-- 2. Cheque Repository (Cleared Only)
SELECT 
    clearance_date as trans_date,
    party_type || ': ' || party_id as party_name,
    'Cheque Cleared: ' || cheque_number as description,
    CASE WHEN type = 'INCOMING' THEN amount ELSE 0 END as amount_in,
    CASE WHEN type = 'OUTGOING' THEN amount ELSE 0 END as amount_out,
    bank_account_id as liquid_account_id,
    'cheques' as source_table,
    id as source_id,
    bank_statement_entry_id
FROM cheques
WHERE status = 'Cleared'

UNION ALL

-- 3. Vendor Payments (Exclude Balance Imports)
SELECT 
    payment_date as trans_date,
    'VENDOR: ' || vendor_id as party_name,
    'Payment' as description,
    0 as amount_in,
    amount as amount_out,
    COALESCE(bank_account_id, 1) as liquid_account_id,
    'vendor_payments' as source_table,
    id as source_id,
    bank_statement_entry_id
FROM vendor_payments
WHERE remarks NOT ILIKE '%Historical Payment Balance Import%'
  AND payment_mode != 'CHEQUE'

UNION ALL

-- 4. DSE Expenses (Verified Only)
SELECT 
    expense_date as trans_date,
    'DSE EXPENSE' as party_name,
    description,
    0 as amount_in,
    amount as amount_out,
    1 as liquid_account_id, -- DSE Expenses are treated as Cash
    'dse_expenses' as source_table,
    id as source_id,
    null as bank_statement_entry_id
FROM dse_expenses
WHERE status = 'Verified'

UNION ALL

-- 5. Main Expenses (Active Only)
SELECT 
    expense_date as trans_date,
    'EXPENSE' as party_name,
    description,
    0 as amount_in,
    grand_total as amount_out,
    CASE WHEN bank_statement_entry_id IS NOT NULL THEN 1002 ELSE payment_source_id END as liquid_account_id, -- Mapping logic
    'expenses' as source_table,
    id as source_id,
    bank_statement_entry_id
FROM expenses
WHERE is_active = true

UNION ALL

-- 6. Other Income (Active Only)
SELECT 
    transaction_date as trans_date,
    'OTHER INCOME' as party_name,
    description,
    amount as amount_in,
    0 as amount_out,
    CASE WHEN bank_statement_entry_id IS NOT NULL THEN 1002 ELSE destination_account_id END as liquid_account_id,
    'other_income' as source_table,
    id as source_id,
    bank_statement_entry_id
FROM other_income
WHERE is_active = true

UNION ALL

-- 7. Internal Transfers (OUTFLOW Side)
SELECT 
    transfer_date as trans_date,
    'INTERNAL TRANSFER' as party_name,
    'Transfer to ' || to_account_id as description,
    0 as amount_in,
    amount as amount_out,
    from_account_id as liquid_account_id,
    'internal_transfers' as source_table,
    id as source_id,
    from_bank_statement_entry_id
FROM internal_transfers
WHERE is_active = true

UNION ALL

-- 8. Internal Transfers (INFLOW Side)
SELECT 
    transfer_date as trans_date,
    'INTERNAL TRANSFER' as party_name,
    'Transfer from ' || from_account_id as description,
    amount as amount_in,
    0 as amount_out,
    to_account_id as liquid_account_id,
    'internal_transfers' as source_table,
    id as source_id,
    to_bank_statement_entry_id
FROM internal_transfers
WHERE is_active = true

UNION ALL

-- 9. Loan Transactions (The Matrix)
SELECT 
    lt.transaction_date as trans_date,
    'LOAN: ' || lt.loan_id as party_name,
    lt.remarks as description,
    -- INFLOW Logic
    CASE 
        WHEN (l.loan_type = 'TAKEN' AND lt.transaction_type = 'DISBURSEMENT') OR (l.loan_type = 'GIVEN' AND lt.transaction_type = 'INSTALLMENT') THEN lt.amount 
        ELSE 0 
    END as amount_in,
    -- OUTFLOW Logic
    CASE 
        WHEN (l.loan_type = 'GIVEN' AND lt.transaction_type = 'DISBURSEMENT') OR (l.loan_type = 'TAKEN' AND lt.transaction_type = 'INSTALLMENT') THEN lt.amount 
        ELSE 0 
    END as amount_out,
    CASE WHEN lt.payment_mode = 'CASH' THEN 1 ELSE 1002 END as liquid_account_id,
    'loan_transactions' as source_table,
    lt.id as source_id,
    lt.bank_statement_entry_id
FROM loan_transactions lt
JOIN loans l ON lt.loan_id = l.id
WHERE lt.payment_mode != 'MIGRATION'

UNION ALL

-- 10. Asset Transactions
SELECT 
    at.transaction_date as trans_date,
    'ASSET: ' || at.asset_id as party_name,
    at.transaction_type as description,
    CASE WHEN at.transaction_type = 'SALE' THEN amount ELSE 0 END as amount_in,
    CASE WHEN at.transaction_type = 'PURCHASE' THEN amount ELSE 0 END as amount_out,
    1002 as liquid_account_id, -- Assets usually hit bank
    'asset_transactions' as source_table,
    id as source_id,
    bank_statement_entry_id
FROM asset_transactions at

UNION ALL

-- 11. Employee Advances
SELECT 
    advance_date as trans_date,
    'ADVANCE: ' || employee_id as party_name,
    remarks as description,
    0 as amount_in,
    amount as amount_out,
    from_account_id as liquid_account_id,
    'employee_advances' as source_table,
    id as source_id,
    bank_statement_entry_id
FROM employee_advances

UNION ALL

-- 12. Employee Salaries (Net Payout)
SELECT 
    payment_date as trans_date,
    'SALARY: ' || employee_id as party_name,
    remarks as description,
    0 as amount_in,
    net_salary as amount_out,
    from_account_id as liquid_account_id,
    'employee_salaries' as source_table,
    id as source_id,
    bank_statement_entry_id
FROM employee_salaries
WHERE payment_date IS NOT NULL

UNION ALL

-- 13. Manual Journal Adjustments (Source Table Null)
SELECT 
    je.transaction_date as trans_date,
    'JOURNAL ADJUSTMENT' as party_name,
    je.description,
    CASE WHEN (jl.debit > 0) THEN jl.debit ELSE 0 END as amount_in,
    CASE WHEN (jl.credit > 0) THEN jl.credit ELSE 0 END as amount_out,
    jl.account_id as liquid_account_id,
    'journal_entries' as source_table,
    je.id as source_id,
    null as bank_statement_entry_id
FROM journal_entries je
JOIN journal_lines jl ON je.id = jl.journal_entry_id
WHERE je.source_table IS NULL 
  AND jl.account_id IN (1, 1002, 1003, 1005) -- Only targeting physical accounts

UNION ALL

-- 14. Opening Balances (The Anchor)
SELECT 
    as_of_date as trans_date,
    'OPENING BALANCE' as party_name,
    description,
    amount as amount_in,
    0 as amount_out,
    account_id as liquid_account_id,
    'opening_balances' as source_table,
    id as source_id,
    null as bank_statement_entry_id
FROM opening_balances
WHERE is_active = true;
