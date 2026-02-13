-- Phase 63.3: DSE Instructions for Delivery
-- Adds 'notes' column to sales_orders to capture special instructions (e.g., "Gate 2 entry", "Call before arrival")

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- We also make sure the API can join properly
CREATE INDEX IF NOT EXISTS idx_sales_orders_id ON sales_orders(id);
