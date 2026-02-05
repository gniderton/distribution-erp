-- 059_add_deposit_bank_to_payments.sql
-- Add deposit_bank column to track credit bank for NEFT/UPI

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_payments' AND column_name = 'deposit_bank') THEN
        ALTER TABLE customer_payments ADD COLUMN deposit_bank TEXT;
    END IF;
END $$;
