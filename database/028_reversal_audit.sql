-- 28. Add Audit Columns for Reversal
-- Reason: To track WHO reversed a GRN and WHEN.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_invoice_headers' AND column_name = 'reversed_by_id') THEN 
        ALTER TABLE purchase_invoice_headers ADD COLUMN reversed_by_id bigint; 
    END IF; 

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_invoice_headers' AND column_name = 'reversed_at') THEN 
        ALTER TABLE purchase_invoice_headers ADD COLUMN reversed_at timestamptz; 
    END IF; 
END $$;
