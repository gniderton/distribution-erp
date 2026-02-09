-- Migration: Fix payment_allocations foreign key constraint
-- Issue: payment_allocations_payment_id_fkey points to vendor_payments instead of customer_payments
-- This causes "Key (payment_id)=(X) is not present in table vendor_payments" error

-- Drop the incorrect foreign key constraint
ALTER TABLE payment_allocations 
DROP CONSTRAINT IF EXISTS payment_allocations_payment_id_fkey;

-- Recreate with correct reference to customer_payments
ALTER TABLE payment_allocations
ADD CONSTRAINT payment_allocations_payment_id_fkey 
FOREIGN KEY (payment_id) REFERENCES customer_payments(id) ON DELETE CASCADE;

-- Verify the constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='payment_allocations'
  AND kcu.column_name = 'payment_id';
