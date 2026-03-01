-- 124_asset_sale_receivable.sql
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS sale_total_amount NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sale_balance_receivable NUMERIC(15, 2) DEFAULT 0;
