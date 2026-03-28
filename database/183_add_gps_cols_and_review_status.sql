-- 183_add_gps_cols_and_review_status.sql

-- 1. Add Latitude/Longitude to customers table directly
-- This allows DSEs to capture GPS without affecting the official 'customer_addresses' until approved.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS latitude NUMERIC(15,10);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS longitude NUMERIC(15,10);

-- 2. Update the Status Constraint to include 'Review_Required'
-- First, drop the old constraint if it exists
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_verification_status_check;

-- Add the new refined constraint
ALTER TABLE customers ADD CONSTRAINT customers_verification_status_check 
CHECK (verification_status IN ('Pending', 'Review_Required', 'Verified', 'Rejected'));

-- 3. Optimization
CREATE INDEX IF NOT EXISTS idx_customers_verify_status ON customers(verification_status);
