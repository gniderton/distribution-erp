SELECT id, invoice_number, grand_total, paid_amount, amount_paid FROM sales_invoices ORDER BY id DESC LIMIT 5;
SELECT id, amount, payment_mode, transaction_ref, status FROM customer_payments ORDER BY id DESC LIMIT 5;
SELECT * FROM customer_payment_allocations ORDER BY id DESC LIMIT 5;
