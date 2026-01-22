-- Phase 24 Refactor: Row-Based Stock Status
-- Goal: Track Damaged/Expired stock as specific batches instead of a summary bucket.

DO $$ 
BEGIN 
    -- 1. Add 'status' column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_batches' AND column_name = 'status') THEN 
        ALTER TABLE inventory_batches ADD COLUMN status TEXT DEFAULT 'Good';
        
        -- Optional: Backfill existing rows as 'Good'
        UPDATE inventory_batches SET status = 'Good' WHERE status IS NULL;
    END IF; 

    -- 2. Add Index for fast lookup of Good vs Bad stock
    CREATE INDEX IF NOT EXISTS idx_batches_status ON inventory_batches (product_id, status) WHERE quantity_remaining > 0;
END $$;
