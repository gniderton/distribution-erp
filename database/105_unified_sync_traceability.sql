-- 105_unified_sync_traceability.sql
-- Phase 69: Unified Sync Traceability (Audit Hub)

-- A. DSE (Sales) Traceability: Link Children to Daily Sales Report
ALTER TABLE daily_sales_reports ADD COLUMN IF NOT EXISTS sync_id BIGINT REFERENCES sync_logs(id);

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS report_id BIGINT REFERENCES daily_sales_reports(id);
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS report_id BIGINT REFERENCES daily_sales_reports(id);
ALTER TABLE dse_expenses ADD COLUMN IF NOT EXISTS report_id BIGINT REFERENCES daily_sales_reports(id);
ALTER TABLE cash_denominations ADD COLUMN IF NOT EXISTS report_id BIGINT REFERENCES daily_sales_reports(id);

-- B. Delivery Traceability: Ensure sync_id is hard foreign keys where possible
-- (Some might already exist as text in earlier migrations, we unify to BIGINT)

-- trip_returns
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_returns' AND column_name='sync_id') THEN
        ALTER TABLE trip_returns ALTER COLUMN sync_id TYPE BIGINT USING sync_id::BIGINT;
    ELSE
        ALTER TABLE trip_returns ADD COLUMN sync_id BIGINT;
    END IF;
    
    -- Add FK if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trip_returns_sync') THEN
        ALTER TABLE trip_returns ADD CONSTRAINT fk_trip_returns_sync FOREIGN KEY (sync_id) REFERENCES sync_logs(id);
    END IF;
END $$;

-- trip_invoices
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_invoices' AND column_name='sync_id') THEN
        ALTER TABLE trip_invoices ALTER COLUMN sync_id TYPE BIGINT USING sync_id::BIGINT;
    ELSE
        ALTER TABLE trip_invoices ADD COLUMN sync_id BIGINT;
    END IF;

    -- Add FK if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trip_invoices_sync') THEN
        ALTER TABLE trip_invoices ADD CONSTRAINT fk_trip_invoices_sync FOREIGN KEY (sync_id) REFERENCES sync_logs(id);
    END IF;
END $$;

-- customer_payments (Delivery Syncs)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_customer_payments_sync') THEN
        ALTER TABLE customer_payments ADD CONSTRAINT fk_customer_payments_sync FOREIGN KEY (sync_id) REFERENCES sync_logs(id);
    END IF;
END $$;

-- C. Indexing for fast historical lookup/audits
CREATE INDEX IF NOT EXISTS idx_so_report ON sales_orders(report_id);
CREATE INDEX IF NOT EXISTS idx_pay_report ON customer_payments(report_id);
CREATE INDEX IF NOT EXISTS idx_exp_report ON dse_expenses(report_id);
CREATE INDEX IF NOT EXISTS idx_dsr_sync ON daily_sales_reports(sync_id);
