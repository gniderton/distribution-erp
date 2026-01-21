-- Phase 24: Stock Adjustments (Audit Trail)
-- Tracks manual movements from Good Stock -> Damaged/Expired/Lost

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    
    qty NUMERIC(12, 3) NOT NULL CHECK (qty > 0),
    reason TEXT NOT NULL, -- 'Damage', 'Expiry', 'Lost', 'Found'
    
    batch_code TEXT, -- Optional: If specific batch was selected
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by BIGINT, -- User ID (Optional)
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_stock_adj_product ON stock_adjustments(product_id);
