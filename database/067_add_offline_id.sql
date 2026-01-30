-- Fix missing columns in sales_orders if table already existed
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS offline_id VARCHAR(50) UNIQUE;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Pending';
