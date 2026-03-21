-- 173_bank_statement_narration_view.sql

DROP VIEW IF EXISTS view_bank_statement_details;
CREATE OR REPLACE VIEW view_bank_statement_details AS
SELECT 
    bse.id as statement_entry_id,
    bse.transaction_date,
    bse.bank_account_id,
    ba.bank_name as account,
    bse.particulars as bank_narration,
    bse.debit_amount,
    bse.credit_amount,
    bse.status as reconciliation_status,
    -- Transaction Type Label
    CASE
        WHEN cp.id IS NOT NULL THEN 'Sales Receipt'
        WHEN vp.id IS NOT NULL THEN 'Vendor Payment'
        WHEN ex.id IS NOT NULL THEN 'Expense'
        WHEN oi.id IS NOT NULL THEN 'Other Income'
        WHEN tr_from.id IS NOT NULL OR tr_to.id IS NOT NULL THEN 'Internal Transfer'
        WHEN at.id IS NOT NULL THEN 
            CASE 
                WHEN at.transaction_type = 'PAYMENT' THEN 'Asset Purchase' 
                WHEN at.transaction_type = 'SALE_PAYMENT' THEN 'Asset Sale' 
                ELSE 'Asset Trans' 
            END
        WHEN lt.id IS NOT NULL THEN 'Loan Transaction'
        ELSE 'Unreconciled'
    END as transaction_type,
    -- ERP Reference
    COALESCE(
        cp.payment_number, 
        vp.payment_number, 
        ex.expense_number, 
        oi.income_number, 
        tr_from.reference_no,
        tr_to.reference_no,
        'N/A'
    ) as erp_reference,
    -- Party Name
    COALESCE(
        custom.customer_name, 
        vend.vendor_name, 
        ee.name, 
        ie.name, 
        'Internal/System'
    ) as party_name,
    -- User Narration
    COALESCE(
        ex.description, 
        oi.description, 
        vp.remarks, 
        tr_from.remarks, 
        tr_to.remarks,
        at.remarks,
        lt.remarks,
        'N/A'
    ) as user_narration,
    -- Auditor Columns
    COALESCE(emp.full_name, 'System') as recorded_by,
    COALESCE(cp.payment_date, vp.payment_date, ex.expense_date, oi.transaction_date, tr_from.transfer_date, tr_to.transfer_date, at.transaction_date, lt.transaction_date) as erp_date,
    COALESCE(cp.created_at, vp.created_at, ex.created_at, oi.created_at, tr_from.created_at, tr_to.created_at, at.created_at, lt.created_at) as erp_recorded_at
FROM bank_statement_entries bse
LEFT JOIN bank_accounts ba ON bse.bank_account_id = ba.id
LEFT JOIN customer_payments cp ON bse.id = cp.bank_statement_entry_id
LEFT JOIN customers custom ON cp.customer_id = custom.id
LEFT JOIN vendor_payments vp ON bse.id = vp.bank_statement_entry_id
LEFT JOIN vendors vend ON vp.vendor_id = vend.id
LEFT JOIN expenses ex ON bse.id = ex.bank_statement_entry_id
LEFT JOIN expense_entities ee ON ex.entity_id = ee.id
LEFT JOIN other_income oi ON bse.id = oi.bank_statement_entry_id
LEFT JOIN income_entities ie ON oi.entity_id = ie.id
LEFT JOIN internal_transfers tr_from ON bse.id = tr_from.from_bank_statement_entry_id
LEFT JOIN internal_transfers tr_to ON bse.id = tr_to.to_bank_statement_entry_id
LEFT JOIN asset_transactions at ON bse.id = at.bank_statement_entry_id
LEFT JOIN loan_transactions lt ON bse.id = lt.bank_statement_entry_id
-- Join with employees to get recorded_by name
LEFT JOIN employees emp ON COALESCE(ex.created_by, oi.created_by) = emp.id;
