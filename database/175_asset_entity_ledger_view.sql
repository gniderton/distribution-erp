-- 175_asset_entity_ledger_view.sql

CREATE OR REPLACE VIEW view_asset_entity_ledger AS
WITH entity_transactions AS (
    -- 1. Asset Purchases (Liability/AP increase)
    SELECT 
        a.purchase_entity_id as entity_id,
        at.transaction_date as date,
        'Asset Purchase: ' || a.asset_name || ' (' || a.asset_purchase_no || ')' as particulars,
        0 as debit,
        at.amount as credit,
        at.id as sort_id,
        at.created_at
    FROM asset_transactions at
    JOIN assets a ON at.asset_id = a.id
    WHERE at.transaction_type = 'PURCHASE' AND a.purchase_entity_id IS NOT NULL

    UNION ALL

    -- 2. Payments to Vendors (Liability/AP decrease)
    SELECT 
        a.purchase_entity_id as entity_id,
        at.transaction_date as date,
        'Payment for Asset: ' || a.asset_name as particulars,
        at.amount as debit,
        0 as credit,
        at.id as sort_id,
        at.created_at
    FROM asset_transactions at
    JOIN assets a ON at.asset_id = a.id
    WHERE at.transaction_type = 'PAYMENT' AND a.purchase_entity_id IS NOT NULL

    UNION ALL

    -- 3. Asset Sales (Receivable/AR increase)
    SELECT 
        a.sale_entity_id as entity_id,
        at.transaction_date as date,
        'Asset Sale: ' || a.asset_name || ' (' || COALESCE(a.sale_invoice_no, 'N/A') || ')' as particulars,
        at.amount as debit,
        0 as credit,
        at.id as sort_id,
        at.created_at
    FROM asset_transactions at
    JOIN assets a ON at.asset_id = a.id
    WHERE at.transaction_type = 'SALE' AND a.sale_entity_id IS NOT NULL

    UNION ALL

    -- 4. Receipts from Customers (Receivable/AR decrease)
    SELECT 
        a.sale_entity_id as entity_id,
        at.transaction_date as date,
        'Receipt for Asset Sale: ' || a.asset_name as particulars,
        0 as debit,
        at.amount as credit,
        at.id as sort_id,
        at.created_at
    FROM asset_transactions at
    JOIN assets a ON at.asset_id = a.id
    WHERE at.transaction_type = 'SALE_PAYMENT' AND a.sale_entity_id IS NOT NULL
)
SELECT 
    *,
    SUM(debit - credit) OVER (PARTITION BY entity_id ORDER BY date, sort_id) as running_balance
FROM entity_transactions;
