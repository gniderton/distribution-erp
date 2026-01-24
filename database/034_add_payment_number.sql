ALTER TABLE vendor_payments ADD COLUMN payment_number TEXT UNIQUE;
CREATE INDEX idx_payments_number ON vendor_payments(payment_number);
