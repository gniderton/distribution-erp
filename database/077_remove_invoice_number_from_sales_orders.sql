-- Remove invoice_number from sales_orders table
-- Maintain clean separation: orders don't need to know their invoice number
-- Relationship maintained via sales_invoices.sales_order_id

-- Drop the column
ALTER TABLE sales_orders 
DROP COLUMN IF EXISTS invoice_number;

-- Drop the index (if it exists)
DROP INDEX IF EXISTS idx_so_invoice_number;

-- The relationship is maintained via:
-- sales_invoices.sales_order_id → sales_orders.id
-- Frontend can use LEFT JOIN to get invoice details when needed
