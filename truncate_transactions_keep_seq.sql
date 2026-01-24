TRUNCATE TABLE 
    purchase_order_headers,
    purchase_order_lines,
    purchase_invoice_headers,
    purchase_invoice_lines,
    inventory_batches,
    stock_adjustments,
    vendor_payments,
    payment_allocations,
    debit_notes,
    debit_note_lines,
    debit_note_allocations
RESTART IDENTITY CASCADE;
