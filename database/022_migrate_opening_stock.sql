-- Move existing stock into 'Opening Stock' batches
INSERT INTO inventory_batches (
    product_id, 
    batch_code, 
    mrp, 
    purchase_rate, 
    quantity_initial, 
    quantity_remaining
)
SELECT 
    id, 
    'OP-STK-' || product_code, -- e.g. OP-STK-SAM-ELE-001
    mrp, 
    purchase_rate, 
    current_stock, 
    current_stock
FROM products 
WHERE current_stock > 0
-- Avoid duplicates if run multiple times
AND NOT EXISTS (
    SELECT 1 FROM inventory_batches WHERE batch_code = 'OP-STK-' || products.product_code
);
