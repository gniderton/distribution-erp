-- 117_make_bank_cols_nullable.sql
-- Allow recording of Other Income and Expenses without selecting a bank account immediately (for Cheques)

-- 1. Other Income
ALTER TABLE other_income ALTER COLUMN destination_account_id DROP NOT NULL;

-- 2. Expenses
ALTER TABLE expenses ALTER COLUMN payment_source_id DROP NOT NULL;

-- 3. Vendor Payments
-- Check if table exists first (just in case)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_payments') THEN
        ALTER TABLE vendor_payments ALTER COLUMN bank_account_id DROP NOT NULL;
    END IF;
END $$;
