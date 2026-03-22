-- 171_entity_ledger_views.sql (Updated with Running Balances and sort_id)

DROP VIEW IF EXISTS view_income_entity_ledger;
DROP VIEW IF EXISTS view_expense_entity_ledger;

-- 1. Income Entity Ledger View
CREATE OR REPLACE VIEW view_income_entity_ledger AS
WITH income_data AS (
    SELECT 
        oi.entity_id,
        oi.transaction_date as date,
        oi.income_number as reference,
        'RECEIPT' as type,
        oi.description,
        0 as debit,
        oi.amount as credit,
        oi.id as sort_id
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
        ip.id as sort_id
    FROM income_penalties ip
)
SELECT 
    *,
    SUM(debit - credit) OVER (PARTITION BY entity_id ORDER BY date, sort_id) as running_balance
FROM income_data;

-- 2. Expense Entity Ledger View
CREATE OR REPLACE VIEW view_expense_entity_ledger AS
WITH expense_data AS (
    SELECT 
        ex.entity_id,
        ex.expense_date as date,
        ex.expense_number as reference,
        'PAYMENT' as type,
        ex.description,
        ex.grand_total as debit,
        0 as credit,
        ex.id as sort_id
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
        ep.id as sort_id
    FROM expense_penalties ep
)
SELECT 
    *,
    SUM(debit - credit) OVER (PARTITION BY entity_id ORDER BY date, sort_id) as running_balance
FROM expense_data;
