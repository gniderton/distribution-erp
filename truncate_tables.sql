TRUNCATE TABLE 
    debit_note_lines, 
    debit_notes, 
    inventory_batches, 
    payment_allocations, 
    product_batches, 
    purchase_invoice_headers, 
    purchase_invoice_lines, 
    purchase_order_headers, 
    purchase_order_lines, 
    stock_adjustments, 
    products 
RESTART IDENTITY CASCADE;
