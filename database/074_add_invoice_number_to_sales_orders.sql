-- Add invoice_number to sales_orders table
-- This allows direct reference to the invoice from the order

ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_so_invoice_number ON sales_orders(invoice_number);

-- Backfill existing invoiced orders (optional - populates historical data)
UPDATE sales_orders so
SET invoice_number = si.invoice_number
FROM sales_invoices si
WHERE so.id = si.sales_order_id 
  AND so.status = 'Invoiced'
  AND so.invoice_number IS NULL;
