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
    -- Join details from various modules
    COALESCE(
        cp.payment_number, 
        vp.payment_number, 
        ex.expense_number, 
        oi.income_number, 
        tr_from.reference_no,
        tr_to.reference_no,
        'Internal'
    ) as erp_reference,
    COALESCE(
        custom.customer_name, 
        vend.vendor_name, 
        ee.name, 
        ie.name, 
        'System'
    ) as party_name,
    COALESCE(
        ex.description, 
        oi.description, 
        vp.remarks, 
        tr_from.remarks,
        tr_to.remarks,
        'N/A'
    ) as user_narration
FROM bank_statement_entries bse
JOIN bank_accounts ba ON bse.bank_account_id = ba.id
LEFT JOIN customer_payments cp ON bse.id = cp.bank_statement_entry_id
LEFT JOIN customers custom ON cp.customer_id = custom.id
LEFT JOIN vendor_payments vp ON bse.id = vp.bank_statement_entry_id
LEFT JOIN vendors vend ON vp.vendor_id = vend.id
LEFT JOIN expenses ex ON bse.id = ex.bank_statement_entry_id
LEFT JOIN expense_entities ee ON ex.entity_id = ee.id
LEFT JOIN other_income oi ON bse.id = oi.bank_statement_entry_id
LEFT JOIN income_entities ie ON oi.entity_id = ie.id
LEFT JOIN internal_transfers tr_from ON bse.id = tr_from.from_bank_statement_entry_id
LEFT JOIN internal_transfers tr_to ON bse.id = tr_to.to_bank_statement_entry_id;
