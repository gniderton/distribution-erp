-- 103_fix_delivery_failure_logic.sql
-- 1. Update status constraints to allow 'Failed' on trip_invoices
ALTER TABLE trip_invoices DROP CONSTRAINT IF EXISTS trip_invoices_delivery_status_check;
ALTER TABLE trip_invoices ADD CONSTRAINT trip_invoices_delivery_status_check 
CHECK (delivery_status IN ('Pending', 'Delivered', 'Partial', 'Returned', 'Undelivered', 'Failed'));

-- 2. Update status constraints to allow 'Failed' on sales_invoices
ALTER TABLE sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_delivery_status_check;
ALTER TABLE sales_invoices ADD CONSTRAINT sales_invoices_delivery_status_check 
CHECK (delivery_status IN ('Pending', 'In Transit', 'Delivered', 'Returned', 'Partial', 'Undelivered', 'Failed'));

-- 3. Add column to store the reason strings (Wait: failure_reason might be better)
ALTER TABLE trip_invoices ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS failure_reason TEXT;
