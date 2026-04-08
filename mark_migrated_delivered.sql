UPDATE sales_invoices 
SET delivery_status = 'Delivered' 
WHERE sales_order_id IS NULL AND (delivery_status = 'Pending' OR delivery_status IS NULL);
