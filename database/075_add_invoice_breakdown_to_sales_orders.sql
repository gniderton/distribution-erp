-- Add invoice financial breakdown columns to sales_orders
-- This allows the sales order to show complete invoice details after conversion

ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS invoice_gross_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS invoice_scheme_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS invoice_discount_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS invoice_taxable_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS invoice_gst_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS invoice_net_amount NUMERIC(12,2);

-- Add comments for clarity
COMMENT ON COLUMN sales_orders.invoice_gross_amount IS 'Total before schemes/discounts (MRP × Qty)';
COMMENT ON COLUMN sales_orders.invoice_scheme_amount IS 'Total value of scheme/free items';
COMMENT ON COLUMN sales_orders.invoice_discount_amount IS 'Total discounts applied';
COMMENT ON COLUMN sales_orders.invoice_taxable_amount IS 'Taxable amount (after disc, before GST)';
COMMENT ON COLUMN sales_orders.invoice_gst_amount IS 'Total GST (CGST + SGST/IGST)';
COMMENT ON COLUMN sales_orders.invoice_net_amount IS 'Final rounded amount to collect';
