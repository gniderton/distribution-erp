-- Migration 082: Add MRP to sales_invoice_lines
ALTER TABLE sales_invoice_lines ADD COLUMN mrp NUMERIC(12, 2);

-- Update existing rows based on the product's current MRP (as a best-effort fallback)
UPDATE sales_invoice_lines sil
SET mrp = p.mrp
FROM products p
WHERE sil.product_id = p.id AND sil.mrp IS NULL;
