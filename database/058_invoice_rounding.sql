-- 058_invoice_rounding.sql
-- Add 'round_off' column and Rounding Account

-- 1. Add round_off column to sales_invoices
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_invoices' AND column_name = 'round_off') THEN
        ALTER TABLE sales_invoices ADD COLUMN round_off NUMERIC(5, 2) DEFAULT 0;
    END IF;
END $$;

-- 2. Add Rounding Adjustment Account (Expense/Income)
INSERT INTO chart_of_accounts (code, name, type) 
VALUES (5003, 'Rounding Adjustment', 'EXPENSE')
ON CONFLICT (code) DO NOTHING;
