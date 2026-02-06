-- 085_enhanced_verification_schema.sql
-- Adds columns for advanced payment verification and report settlement

-- 1. Updates to customer_payments for Cheque image and Cash denominations
ALTER TABLE customer_payments 
    ADD COLUMN IF NOT EXISTS cheque_image_url TEXT,
    ADD COLUMN IF NOT EXISTS verification_data JSONB,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by BIGINT REFERENCES employees(id);

-- 2. Updates to daily_sales_reports for Settlement tracking
ALTER TABLE daily_sales_reports
    ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS settled_by BIGINT REFERENCES employees(id);

-- 3. Update status constraints (if applicable)
-- Assuming verification_status is already TEXT. We will handle logic in backend.
-- We can add a comment or documentation on the intended status flow:
-- Pending -> Verified | Rejected
-- (For Cheques, AI verification may set it to 'Verified' or 'Needs Review')
