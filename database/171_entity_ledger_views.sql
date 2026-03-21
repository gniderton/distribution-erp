-- 171_entity_ledger_views.sql

-- 1. Income Entity Ledger View
CREATE OR REPLACE VIEW view_income_entity_ledger AS
SELECT 
    oi.entity_id,
    oi.transaction_date as date,
    oi.income_number as reference,
    'RECEIPT' as type,
    oi.description,
    0 as debit,
    oi.amount as credit,
    oi.id as transaction_id
FROM other_income oi
UNION ALL
SELECT 
    ip.entity_id,
    ip.penalty_date as date,
    ip.penalty_number as reference,
    'PENALTY' as type,
    ip.remarks as description,
    ip.amount as debit,
    0 as credit,
    ip.id as transaction_id
FROM income_penalties ip;

-- 2. Expense Entity Ledger View
CREATE OR REPLACE VIEW view_expense_entity_ledger AS
SELECT 
    ex.entity_id,
    ex.expense_date as date,
    ex.expense_number as reference,
    'PAYMENT' as type,
    ex.description,
    ex.grand_total as debit,
    0 as credit,
    ex.id as transaction_id
FROM expenses ex
UNION ALL
SELECT 
    ep.entity_id,
    ep.penalty_date as date,
    ep.penalty_number as reference,
    'PENALTY' as type,
    ep.remarks as description,
    0 as debit,
    ep.amount as credit,
    ep.id as transaction_id
FROM expense_penalties ep;
