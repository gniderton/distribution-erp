-- Revert invoice breakdown columns from sales_orders
-- Keep only invoice_number as a reference/foreign key
-- Invoice details should remain in sales_invoices table only

ALTER TABLE sales_orders 
DROP COLUMN IF EXISTS invoice_gross_amount,
DROP COLUMN IF EXISTS invoice_scheme_amount,
DROP COLUMN IF EXISTS invoice_discount_amount,
DROP COLUMN IF EXISTS invoice_taxable_amount,
DROP COLUMN IF EXISTS invoice_gst_amount,
DROP COLUMN IF EXISTS invoice_net_amount;

-- invoice_number column is kept as a reference for quick lookups
