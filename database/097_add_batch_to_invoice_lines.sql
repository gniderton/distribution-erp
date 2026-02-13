-- Phase 63.3.1: Add Batch Support to Invoice Lines
-- Required for Delivery Picklist generation

ALTER TABLE sales_invoice_lines ADD COLUMN IF NOT EXISTS batch_id BIGINT REFERENCES inventory_batches(id);

-- Also fix qty column name if mismatch (delivery.js uses 'sil.qty', table has 'shipped_qty')
-- We will update delivery.js instead of renaming column to preserve semantics.
