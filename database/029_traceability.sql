-- 29. Add Parent Invoice Link (For Traceability)
-- Reason: To link a New GRN (Correction) to the Old GRN (Reversal).

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_invoice_headers' AND column_name = 'parent_invoice_id') THEN 
        ALTER TABLE purchase_invoice_headers ADD COLUMN parent_invoice_id bigint REFERENCES purchase_invoice_headers(id); 
    END IF; 
END $$;
