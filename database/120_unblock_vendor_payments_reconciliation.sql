-- 120_unblock_vendor_payments_reconciliation.sql
-- Goal: Separate Customer and Vendor allocations to solve the FK violation

-- 1. Ensure customer_payment_allocations has all necessary columns
ALTER TABLE customer_payment_allocations 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS expected_invoice_balance NUMERIC(12, 2) DEFAULT 0;

-- 2. Migrate existing Customer data from payment_allocations to customer_payment_allocations
-- Only migrate if payment_allocations currently points to customer_payments (which it does based on the FK error)
INSERT INTO customer_payment_allocations (payment_id, invoice_id, amount, status, expected_invoice_balance)
SELECT payment_id, invoice_id, amount, status, expected_invoice_balance
FROM payment_allocations
WHERE invoice_id IS NOT NULL;

-- 3. Clean up payment_allocations for VENDOR use ONLY
-- Delete the customer records we just moved
DELETE FROM payment_allocations WHERE invoice_id IS NOT NULL;

-- Drop customer-related columns and constraints
ALTER TABLE payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_invoice_id_fkey;
ALTER TABLE payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_payment_id_fkey;
ALTER TABLE payment_allocations DROP COLUMN IF EXISTS invoice_id;
ALTER TABLE payment_allocations DROP COLUMN IF EXISTS status;
ALTER TABLE payment_allocations DROP COLUMN IF EXISTS expected_invoice_balance;

-- 4. Correct the foreign key for payment_allocations to point back to vendor_payments
ALTER TABLE payment_allocations
ADD CONSTRAINT payment_allocations_payment_id_fkey 
FOREIGN KEY (payment_id) REFERENCES vendor_payments(id) ON DELETE CASCADE;

-- 5. Add purchase_invoice_id if it was somehow missing (though it exists according to my check)
-- Ensuring it has a correct FK
ALTER TABLE payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_purchase_invoice_id_fkey;
ALTER TABLE payment_allocations
ADD CONSTRAINT payment_allocations_purchase_invoice_id_fkey 
FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoice_headers(id) ON DELETE CASCADE;
