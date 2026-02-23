-- Phase 106: Fix sync_logs trip_id data type
-- Convert from TEXT to BIGINT to match delivery_trips.id and prevent type mismatches

DO $$ 
BEGIN 
    -- 1. Check if column is already BIGINT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sync_logs' 
        AND column_name = 'trip_id' 
        AND data_type = 'text'
    ) THEN
        -- 2. Alter column type with implicit cast
        ALTER TABLE sync_logs ALTER COLUMN trip_id TYPE BIGINT USING trip_id::BIGINT;
    END IF;
END $$;
