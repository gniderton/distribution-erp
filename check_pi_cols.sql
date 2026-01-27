SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'purchase_invoice_lines' 
AND column_name IN ('purchase_invoice_id', 'purchase_invoice_header_id', 'batch_number', 'batch_code');
