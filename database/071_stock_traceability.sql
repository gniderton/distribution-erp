-- 71. Stock Traceability (Inventory Ledger)
-- Logic: Tracks every movement of stock (Inward, Outward, Adjustment, Transit Usage).

CREATE TABLE IF NOT EXISTS stock_traceability (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    batch_id BIGINT REFERENCES inventory_batches(id), -- Link to specific FIFO lot
    product_id BIGINT NOT NULL REFERENCES products(id),
    
    quantity_change NUMERIC(12, 3) NOT NULL, -- Negative for OUT, Positive for IN
    transaction_type TEXT NOT NULL, -- 'IN', 'OUT', 'OUT-TRANSIT', 'ADJUSTMENT'
    
    reference_id BIGINT, -- ID of the Invoice, GRN, or Adjustment
    reference_type TEXT, -- 'Sales Invoice', 'Purchase Invoice', 'Stock Adjustment'
    
    notes TEXT
);

-- Indexing for fast history lookups
CREATE INDEX idx_stock_trace_batch ON stock_traceability(batch_id);
CREATE INDEX idx_stock_trace_product ON stock_traceability(product_id);
CREATE INDEX idx_stock_trace_ref ON stock_traceability(reference_id, reference_type);

-- RLS
ALTER TABLE stock_traceability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access for dev" ON stock_traceability;
CREATE POLICY "Enable access for dev" ON stock_traceability FOR ALL USING (true);
