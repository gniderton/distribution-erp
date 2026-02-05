-- 056_payment_verification_schema.sql

-- 1. Add verification columns to customer_payments
DO $$
BEGIN
    -- verification_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_payments' AND column_name = 'verification_status') THEN
        ALTER TABLE customer_payments ADD COLUMN verification_status VARCHAR(20) DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected'));
    END IF;

    -- rejection_reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_payments' AND column_name = 'rejection_reason') THEN
        ALTER TABLE customer_payments ADD COLUMN rejection_reason TEXT;
    END IF;

    -- verified_by (Audit)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_payments' AND column_name = 'verified_by') THEN
        ALTER TABLE customer_payments ADD COLUMN verified_by BIGINT; -- References employee_id or user_id
    END IF;

    -- verified_at (Audit)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_payments' AND column_name = 'verified_at') THEN
        ALTER TABLE customer_payments ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Add finance_remark to daily_sales_reports
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_sales_reports' AND column_name = 'finance_remark') THEN
        ALTER TABLE daily_sales_reports ADD COLUMN finance_remark TEXT;
    END IF;
    
    -- Also add verified_status to DSR itself (for full day settlement)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_sales_reports' AND column_name = 'settlement_status') THEN
        ALTER TABLE daily_sales_reports ADD COLUMN settlement_status VARCHAR(20) DEFAULT 'Pending' CHECK (settlement_status IN ('Pending', 'Settled'));
    END IF;
END $$;
