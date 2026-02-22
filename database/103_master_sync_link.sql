-- Phase 103: Master Sync ID & Trip Verification Gate
-- Establish central sync tracing and manager approval for deliveries

DO $$ 
BEGIN 
    -- 1. Upgrade sync_logs to Sync Header status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sync_logs' AND column_name='synced_by') THEN
        ALTER TABLE sync_logs ADD COLUMN synced_by BIGINT REFERENCES employees(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sync_logs' AND column_name='sync_type') THEN
        ALTER TABLE sync_logs ADD COLUMN sync_type TEXT DEFAULT 'Delivery';
    END IF;

    -- 2. Add sync_id to all related transaction tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_payments' AND column_name='sync_id') THEN
        ALTER TABLE customer_payments ADD COLUMN sync_id BIGINT REFERENCES sync_logs(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dse_expenses' AND column_name='sync_id') THEN
        ALTER TABLE dse_expenses ADD COLUMN sync_id BIGINT REFERENCES sync_logs(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cash_denominations' AND column_name='sync_id') THEN
        ALTER TABLE cash_denominations ADD COLUMN sync_id BIGINT REFERENCES sync_logs(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='sync_id') THEN
        ALTER TABLE sales_orders ADD COLUMN sync_id BIGINT REFERENCES sync_logs(id);
    END IF;

    -- 3. Update trip_invoices (Master Sync & Verification Gate)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_invoices' AND column_name='sync_id') THEN
        ALTER TABLE trip_invoices ADD COLUMN sync_id BIGINT REFERENCES sync_logs(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_invoices' AND column_name='verification_status') THEN
        ALTER TABLE trip_invoices ADD COLUMN verification_status TEXT DEFAULT 'Pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_invoices' AND column_name='verified_by') THEN
        ALTER TABLE trip_invoices ADD COLUMN verified_by BIGINT REFERENCES employees(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_invoices' AND column_name='verified_at') THEN
        ALTER TABLE trip_invoices ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;

    -- Add constraint for trip_invoices
    ALTER TABLE trip_invoices DROP CONSTRAINT IF EXISTS trip_invoices_verification_status_check;
    ALTER TABLE trip_invoices ADD CONSTRAINT trip_invoices_verification_status_check 
        CHECK (verification_status IN ('Pending', 'Approved', 'Rejected'));

    -- 4. Harden trip_returns Table
    -- Ensure it matches the user's provided schema exactly
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_returns' AND column_name='customer_id') THEN
        ALTER TABLE trip_returns ADD COLUMN customer_id BIGINT REFERENCES customers(id);
    END IF;

    -- Ensure qty is numeric(12, 2)
    ALTER TABLE trip_returns ALTER COLUMN qty TYPE NUMERIC(12, 2);

    -- Ensure verification columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_returns' AND column_name='verified_by') THEN
        ALTER TABLE trip_returns ADD COLUMN verified_by BIGINT REFERENCES employees(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_returns' AND column_name='verified_at') THEN
        ALTER TABLE trip_returns ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_returns' AND column_name='sync_id') THEN
        ALTER TABLE trip_returns ADD COLUMN sync_id BIGINT REFERENCES sync_logs(id);
    END IF;

    -- Ensure verification_status has the correct constraint
    ALTER TABLE trip_returns DROP CONSTRAINT IF EXISTS trip_returns_verification_status_check;
    ALTER TABLE trip_returns ADD CONSTRAINT trip_returns_verification_status_check 
        CHECK (verification_status IN ('Pending', 'Approved', 'Rejected'));

END $$;
