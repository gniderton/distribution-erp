-- Phase 65: Add Missing Columns to Trip Returns
-- To support detailed batch/condition tracking during doorstep rejections

DO $$ 
BEGIN 
    -- 1. Add batch_id to trip_returns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_returns' AND column_name='batch_id') THEN
        ALTER TABLE trip_returns ADD COLUMN batch_id BIGINT;
    END IF;

    -- 2. Add condition to trip_returns (Good / Expired / Damaged)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_returns' AND column_name='condition') THEN
        ALTER TABLE trip_returns ADD COLUMN condition TEXT;
    END IF;

    -- 3. Relax return_type constraint if it exists to allow flexibility
    -- (Previous check only allowed 'Instant Rejection' and 'Expiry/Damage Return')
    ALTER TABLE trip_returns DROP CONSTRAINT IF EXISTS trip_returns_return_type_check;

END $$;
