-- 🛡️ Unified Liquid Ledger Forensic View (v13: Stream-Only Engine)
-- REMOVED Section 13 (Opening Balances) to prevent double-counting in the ledger.
-- The API now handles the Migration Anchor mathematically.
DROP VIEW IF EXISTS view_unified_liquid_ledger;

CREATE VIEW view_unified_liquid_ledger AS
-- 1. Customer Payments (Strict Cash Purity)
SELECT 
    cp.payment_date as trans_date,
    'CUSTOMER: ' || cp.id as party_name,
    'Collection (' || cp.payment_mode || ')' as description,
    cp.amount as amount_in,
    0 as amount_out,
    CASE 
        WHEN TRIM(cp.payment_mode) ILIKE 'CHEQUE' THEN 1004 
        WHEN TRIM(cp.payment_mode) ILIKE 'CASH' THEN 1
        ELSE 1002 
    END as liquid_account_id,
    cp.bank_id as direct_bank_id,
    'customer_payments' as source_table,
    cp.id as source_id,
    cp.bank_statement_entry_id,
    je.id as journal_entry_id
FROM customer_payments cp
LEFT JOIN journal_entries je ON je.reference_id = cp.id AND je.reference_type = 'CUSTOMER_PAYMENT'
WHERE cp.is_active = true 
  AND cp.payment_number IS NOT NULL
  AND (
      (cp.payment_mode ILIKE 'CASH')
      OR (cp.payment_mode NOT ILIKE 'CHEQUE' AND cp.bank_id != 1)
  )

UNION ALL

-- 2. Cheque Repository (All Statuses except Cancelled)
SELECT 
    cheque_date as trans_date,
    party_type || ': ' || party_id as party_name,
    'Cheque (' || status || '): ' || cheque_number as description,
    CASE WHEN type = 'INCOMING' THEN amount ELSE 0 END as amount_in,
    CASE WHEN type = 'OUTGOING' THEN amount ELSE 0 END as amount_out,
    1004 as liquid_account_id,
    bank_account_id as direct_bank_id,
    'cheques' as source_table,
    id as source_id,
    bank_statement_entry_id,
    null as journal_entry_id
FROM cheques
WHERE status NOT ILIKE 'Cancelled'

UNION ALL

-- 3. Vendor Payments (Strict Cash Purity)
SELECT 
    vp.payment_date as trans_date,
    'VENDOR: ' || vp.vendor_id as party_name,
    'Payment (' || vp.payment_mode || ')' as description,
    0 as amount_in,
    vp.amount as amount_out,
    CASE 
        WHEN TRIM(vp.payment_mode) ILIKE 'CHEQUE' THEN 1004 
        WHEN TRIM(vp.payment_mode) ILIKE 'CASH' THEN 1
        ELSE 1002 
    END as liquid_account_id,
    vp.bank_account_id as direct_bank_id,
    'vendor_payments' as source_table,
    vp.id as source_id,
    vp.bank_statement_entry_id,
    je.id as journal_entry_id
FROM vendor_payments vp
LEFT JOIN journal_entries je ON je.reference_id = vp.id AND je.reference_type = 'VENDOR_PAYMENT'
WHERE vp.remarks NOT ILIKE '%Historical Payment Balance Import%'
  AND vp.remarks NOT ILIKE '%Migration Entry for Axis Bank%'
  AND (
      (vp.payment_mode ILIKE 'CASH')
      OR (vp.payment_mode NOT ILIKE 'CHEQUE' AND vp.bank_account_id != 1)
  )

UNION ALL

-- 4. DSE Expenses (Always Cash)
SELECT 
    expense_date as trans_date,
    'DSE EXPENSE' as party_name,
    description,
    0 as amount_in,
    amount as amount_out,
    1 as liquid_account_id,
    1 as direct_bank_id,
    'dse_expenses' as source_table,
    id as source_id,
    null as bank_statement_entry_id,
    null as journal_entry_id
FROM dse_expenses
WHERE status ILIKE 'Verified'

UNION ALL

-- 5. Main Expenses
SELECT 
    expense_date as trans_date,
    'EXPENSE' as party_name,
    description,
    0 as amount_in,
    grand_total as amount_out,
    CASE WHEN bank_statement_entry_id IS NOT NULL THEN 1002 ELSE payment_source_id END as liquid_account_id,
    payment_source_id as direct_bank_id,
    'expenses' as source_table,
    id as source_id,
    bank_statement_entry_id,
    journal_entry_id
FROM expenses
WHERE is_active = true

UNION ALL

-- 6. Other Income
SELECT 
    transaction_date as trans_date,
    'OTHER INCOME' as party_name,
    description,
    amount as amount_in,
    0 as amount_out,
    CASE WHEN bank_statement_entry_id IS NOT NULL THEN 1002 ELSE destination_account_id END as liquid_account_id,
    destination_account_id as direct_bank_id,
    'other_income' as source_table,
    id as source_id,
    bank_statement_entry_id,
    journal_entry_id
FROM other_income
WHERE is_active = true

UNION ALL

-- 7. Internal Transfers (Out)
SELECT 
    transfer_date as trans_date,
    'INTERNAL TRANSFER' as party_name,
    'Transfer to ' || to_account_id as description,
    0 as amount_in,
    amount as amount_out,
    from_account_id as liquid_account_id,
    from_account_id as direct_bank_id,
    'internal_transfers' as source_table,
    id as source_id,
    from_bank_statement_entry_id,
    journal_entry_id
FROM internal_transfers
WHERE is_active = true

UNION ALL

-- 8. Internal Transfers (In)
SELECT 
    transfer_date as trans_date,
    'INTERNAL TRANSFER' as party_name,
    'Transfer from ' || from_account_id as description,
    amount as amount_in,
    0 as amount_out,
    to_account_id as liquid_account_id,
    to_account_id as direct_bank_id,
    'internal_transfers' as source_table,
    id as source_id,
    to_bank_statement_entry_id,
    journal_entry_id
FROM internal_transfers
WHERE is_active = true

UNION ALL

-- 9. Loan Transactions
SELECT 
    lt.transaction_date as trans_date,
    'LOAN: ' || lt.loan_id as party_name,
    lt.remarks as description,
    CASE WHEN (l.loan_type = 'TAKEN' AND lt.transaction_type = 'DISBURSEMENT') OR (l.loan_type = 'GIVEN' AND lt.transaction_type = 'INSTALLMENT') THEN lt.amount ELSE 0 END as amount_in,
    CASE WHEN (l.loan_type = 'GIVEN' AND lt.transaction_type = 'DISBURSEMENT') OR (l.loan_type = 'TAKEN' AND lt.transaction_type = 'INSTALLMENT') THEN lt.amount ELSE 0 END as amount_out,
    CASE WHEN lt.payment_mode ILIKE 'CASH' THEN 1 ELSE 1002 END as liquid_account_id,
    (SELECT bank_account_id FROM bank_statement_entries WHERE id = lt.bank_statement_entry_id) as direct_bank_id,
    'loan_transactions' as source_table,
    lt.id as source_id,
    lt.bank_statement_entry_id,
    null as journal_entry_id
FROM loan_transactions lt
JOIN loans l ON lt.loan_id = l.id
WHERE lt.payment_mode NOT ILIKE 'MIGRATION'

UNION ALL

-- 10. Assets
SELECT 
    at.transaction_date as trans_date,
    'ASSET: ' || at.asset_id as party_name,
    at.transaction_type as description,
    CASE WHEN at.transaction_type ILIKE 'SALE' THEN amount ELSE 0 END as amount_in,
    CASE WHEN at.transaction_type ILIKE 'PURCHASE' THEN amount ELSE 0 END as amount_out,
    1002 as liquid_account_id,
    null as direct_bank_id,
    'asset_transactions' as source_table,
    id as source_id,
    bank_statement_entry_id,
    journal_entry_id
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
    from_account_id as direct_bank_id,
    'employee_advances' as source_table,
    id as source_id,
    bank_statement_entry_id,
    journal_entry_id
FROM employee_advances

UNION ALL

-- 12. Employee Salaries
SELECT 
    payment_date as trans_date,
    'SALARY: ' || employee_id as party_name,
    remarks as description,
    0 as amount_in,
    net_salary as amount_out,
    from_account_id as liquid_account_id,
    from_account_id as direct_bank_id,
    'employee_salaries' as source_table,
    id as source_id,
    bank_statement_entry_id,
    journal_entry_id
FROM employee_salaries
WHERE payment_date IS NOT NULL

UNION ALL

-- 13. Cheque Clearing (Journal Entries)
-- This tracks the movement FROM 1004 (Repository) TO a real bank account.
-- It ensures that the conversion of cheques to liquid cash is reflected.
SELECT 
    je.transaction_date as trans_date,
    'CHEQUE CLEARING' as party_name,
    je.description,
    jl.debit as amount_in,
    jl.credit as amount_out,
    COALESCE(jl.bank_account_id, jl.account_id) as liquid_account_id,
    jl.bank_account_id as direct_bank_id,
    'journal_lines' as source_table,
    jl.id as source_id,
    null as bank_statement_entry_id,
    je.id as journal_entry_id
FROM journal_lines jl
JOIN journal_entries je ON jl.journal_entry_id = je.id
WHERE je.reference_type = 'CHQ_CLEAR'
  AND (jl.bank_account_id IS NOT NULL OR jl.account_id = 1004);
