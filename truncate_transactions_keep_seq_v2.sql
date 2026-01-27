-- Truncate Transactional Tables (Cascading to children)
-- This clears the data but PRESERVES 'document_sequences'

TRUNCATE TABLE 
    journal_lines, 
    journal_entries,
    stock_adjustments,
    debit_note_allocations, 
    debit_note_lines, 
    debit_notes,
    payment_allocations, 
    vendor_payments,
    inventory_batches,
    purchase_invoice_lines, 
    purchase_invoice_headers,
    purchase_order_lines, 
    purchase_order_headers
RESTART IDENTITY CASCADE;

-- Note: 'RESTART IDENTITY' resets the 'id' serial column of these tables to 1.
-- We are NOT touching 'document_sequences', 'products', 'vendors', etc.
