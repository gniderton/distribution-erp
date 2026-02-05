-- 057_add_payment_details.sql
-- Add detailed columns for Cheque/Online payments

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_payments' AND column_name = 'bank_name') THEN
        ALTER TABLE customer_payments ADD COLUMN bank_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_payments' AND column_name = 'cheque_date') THEN
        ALTER TABLE customer_payments ADD COLUMN cheque_date DATE;
    END IF;
END $$;
