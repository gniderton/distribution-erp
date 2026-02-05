-- 061_make_purchase_invoice_id_nullable.sql
-- Allow Sales Invoices to be allocated without a purchase invoice

ALTER TABLE payment_allocations ALTER COLUMN purchase_invoice_id DROP NOT NULL;
