SELECT id, payment_mode, amount, verification_status, rejection_reason, verified_by, verified_at
FROM customer_payments 
WHERE id IN (18, 19, 20, 21, 22, 23, 24, 25)
ORDER BY id;
