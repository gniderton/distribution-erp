-- 104_add_idempotency_ids.sql
-- 1. Add offline_id to customer_payments
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_payments' AND column_name='offline_id') THEN
        ALTER TABLE customer_payments ADD COLUMN offline_id TEXT UNIQUE;
    END IF;
END $$;

-- 2. Add offline_id to trip_returns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_returns' AND column_name='offline_id') THEN
        ALTER TABLE trip_returns ADD COLUMN offline_id TEXT UNIQUE;
    END IF;
END $$;

-- 3. Add offline_id to dse_expenses (For consistency)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dse_expenses' AND column_name='offline_id') THEN
        ALTER TABLE dse_expenses ADD COLUMN offline_id TEXT UNIQUE;
    END IF;
END $$;
