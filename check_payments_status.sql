SELECT id, payment_mode, amount, verification_status, rejection_reason 
FROM customer_payments 
ORDER BY id DESC 
LIMIT 20;
