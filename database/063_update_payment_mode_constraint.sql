-- 063_update_payment_mode_constraint.sql
-- Add 'NEFT' to the allowed payment modes in customer_payments

-- 1. Find the name of the check constraint (usually it's auto-generated or predictable)
-- 2. Drop it and recreate it with the new list

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'customer_payments'::regclass
      AND pg_get_constraintdef(oid) LIKE '%payment_mode%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE customer_payments DROP CONSTRAINT ' || constraint_name;
    END IF;

    ALTER TABLE customer_payments ADD CONSTRAINT customer_payments_payment_mode_check 
    CHECK (payment_mode IN ('Cash', 'Cheque', 'UPI', 'Bank Transfer', 'NEFT'));
END $$;
