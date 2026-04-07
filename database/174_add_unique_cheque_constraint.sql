-- 174_add_unique_cheque_constraint.sql
-- This migration adds a safety guard to prevent duplicate cheques from sync retries.
-- It enforces that the combination of Cheque Number, Amount, Bank, and Party (Customer/Vendor) must be unique.

DO $$
BEGIN
    -- 1. Add a unique constraint (composite key)
    -- We use a unique index which is the most robust way to handle this in Postgres.
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'idx_unique_cheque_payment'
    ) THEN
        CREATE UNIQUE INDEX idx_unique_cheque_payment 
        ON cheques (cheque_number, amount, bank_name, party_id);
        
        RAISE NOTICE 'Unique index idx_unique_cheque_payment created successfully.';
    END IF;
END $$;
