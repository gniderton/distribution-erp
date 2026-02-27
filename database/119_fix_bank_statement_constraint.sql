-- 119_fix_bank_statement_constraint.sql
-- Fix the check_amount_limit constraint to account for debit_amount and credit_amount

-- 1. Drop the old constraint
ALTER TABLE bank_statement_entries DROP CONSTRAINT IF EXISTS check_amount_limit;

-- 2. Add a new constraint that looks at whichever amount is relevant
-- Note: status update logic in routes handles whether it's credit or debit consumption.
-- Here we just ensure we don't consume more than the total of the transaction.
ALTER TABLE bank_statement_entries 
ADD CONSTRAINT check_amount_limit 
CHECK (consumed_amount <= (COALESCE(debit_amount, 0) + COALESCE(credit_amount, 0) + COALESCE(amount, 0)));

-- also let's make sure the legacy amount column is synced with credits/debits if it's missing
UPDATE bank_statement_entries 
SET amount = COALESCE(debit_amount, 0) + COALESCE(credit_amount, 0) 
WHERE amount = 0 OR amount IS NULL;
