SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('purchase_invoice_lines', 'purchase_invoice_headers');
