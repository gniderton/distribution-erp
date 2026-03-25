-- 182_add_customer_verification_status.sql

-- 1. Add Verification Status Column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='verification_status') THEN
        ALTER TABLE customers ADD COLUMN verification_status TEXT DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected'));
    END IF;
END $$;

-- 2. Add Tracking Columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS verified_by BIGINT REFERENCES employees(id);

-- 3. Update Existing Customers to 'Verified' (Optional - to avoid blocking work)
-- UPDATE customers SET verification_status = 'Verified' WHERE verification_status IS NULL;

-- 4. Enable RLS for the new columns (already enabled for table, just ensuring policies allow)
-- No changes needed if 'Enable access for dev' exists.
