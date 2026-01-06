-- Phase 3: Stock Categorization (buckets)

DO $$ 
BEGIN 
    -- 1. Modify Product Batches (The Detail Level)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_batches' AND column_name = 'current_qty_damaged') THEN 
        ALTER TABLE product_batches RENAME COLUMN current_qty TO qty_good; -- Rename for clarity
        ALTER TABLE product_batches ADD COLUMN qty_damaged numeric(12, 3) DEFAULT 0;
        ALTER TABLE product_batches ADD COLUMN qty_returned numeric(12, 3) DEFAULT 0;
    END IF; 

    -- 2. Modify Products (The Summary Level)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'damaged_stock') THEN 
        ALTER TABLE products ADD COLUMN damaged_stock numeric(12, 3) DEFAULT 0;
    END IF; 
END $$;
