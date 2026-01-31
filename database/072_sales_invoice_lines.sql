-- 72. Sales Invoice Lines
-- Logic: Stores specific line items for each invoice (Enables Partial Shipments).

CREATE TABLE IF NOT EXISTS sales_invoice_lines (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    
    -- Quantities
    shipped_qty NUMERIC(12, 3) NOT NULL CHECK (shipped_qty > 0),
    
    -- Pricing (Snapshotted from the order/batch at time of invoicing)
    rate NUMERIC(12, 2) NOT NULL,
    tax_percent NUMERIC(5, 2) DEFAULT 0,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    amount NUMERIC(12, 2) NOT NULL -- Net (Rate * Qty + Tax)
);

CREATE INDEX idx_inv_lines_header ON sales_invoice_lines(invoice_id);
CREATE INDEX idx_inv_lines_prod ON sales_invoice_lines(product_id);

-- RLS
ALTER TABLE sales_invoice_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access for dev" ON sales_invoice_lines;
CREATE POLICY "Enable access for dev" ON sales_invoice_lines FOR ALL USING (true);
