TRUNCATE TABLE 
    payment_allocations, 
    product_batches, 
    inventory_batches, -- Added as it replaced product_batches
    purchase_invoice_headers, 
    purchase_invoice_lines, 
    purchase_order_headers, 
    purchase_order_lines, 
    vendor_payments,
    debit_notes,
    debit_note_lines,
    stock_adjustments
RESTART IDENTITY CASCADE;
