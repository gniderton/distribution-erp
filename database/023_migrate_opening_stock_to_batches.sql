-- Phase 16: Combine with Existing 'product_batches'
-- 1. Clean up duplicate table (from my confusion)
DROP TABLE IF EXISTS inventory_batches CASCADE;

-- 2. Migrate Opening Stock to 'product_batches'
INSERT INTO product_batches (
    product_id, 
    batch_number, 
    mrp, 
    purchase_rate, 
    sale_rate,
    initial_qty, 
    qty_good,
    received_date,
    is_active
)
SELECT 
    id, 
    'OP-STK-' || product_code, -- e.g. OP-STK-SAM-ELE-001
    mrp, 
    purchase_rate, 
    retail_rate, -- Default sale rate
    current_stock, 
    current_stock,
    CURRENT_DATE,
    true
FROM products 
WHERE current_stock > 0
-- Avoid duplicates if run multiple times
AND NOT EXISTS (
    SELECT 1 FROM product_batches WHERE batch_number = 'OP-STK-' || products.product_code
);
