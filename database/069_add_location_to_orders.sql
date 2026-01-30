-- Add location columns to sales_orders
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
-- Also add to customer_visits if we implement that later
ALTER TABLE customer_visits ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE customer_visits ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
