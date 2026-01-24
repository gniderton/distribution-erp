ALTER TABLE inventory_batches ADD COLUMN purchase_invoice_line_id BIGINT;
CREATE INDEX idx_batches_line_id ON inventory_batches(purchase_invoice_line_id);
