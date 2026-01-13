-- DANGER: This script wipes all data.
-- Fixed column names: document_type, current_number (Removed padding)

-- 1. Truncate Transactional Tables (Cascade handles dependencies)
TRUNCATE TABLE 
    payment_allocations,
    vendor_payments,
    product_batches,
    purchase_invoice_lines,
    purchase_invoice_headers,
    purchase_order_lines,
    purchase_order_headers,
    products,
    vendors,
    brands,
    categories,
    taxes,
    hsn_codes,
    document_sequences
    RESTART IDENTITY CASCADE;

-- 2. Reset Sequences Manually
ALTER SEQUENCE IF EXISTS purchase_order_headers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS purchase_invoice_headers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS products_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS vendors_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS vendor_payments_id_seq RESTART WITH 1;

-- 3. Re-seed Basic Defaults
-- Correct Columns: document_type, prefix, current_number (Removed padding)
INSERT INTO document_sequences (document_type, prefix, current_number) VALUES 
('PO', 'PO', 0),
('GRN', 'GRN', 0),
('PAY', 'PAY', 0),
('DN', 'DN', 0);
