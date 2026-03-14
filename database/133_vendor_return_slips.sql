-- Add note_type to debit_notes
ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'Debit Note';

-- Ensure the document_sequences has a unique constraint for safety (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uni_doc_type_branch'
    ) THEN
        ALTER TABLE document_sequences ADD CONSTRAINT uni_doc_type_branch UNIQUE (company_settings_id, branch_id, document_type);
    END IF;
END $$;

-- Seed Sequence for Return Slips
INSERT INTO document_sequences (company_settings_id, branch_id, document_type, prefix, current_number)
VALUES (1, 1, 'RS', 'GD-CLT-RS-26-', 0)
ON CONFLICT ON CONSTRAINT uni_doc_type_branch DO NOTHING;

-- Ensure DN Sequence is seeded correctly
INSERT INTO document_sequences (company_settings_id, branch_id, document_type, prefix, current_number)
VALUES (1, 1, 'DN', 'GD-CLT-DN-26-', 0)
ON CONFLICT ON CONSTRAINT uni_doc_type_branch DO NOTHING;

-- Update Vendor Ledger to exclude non-financial Return Slips
DROP VIEW IF EXISTS view_vendor_ledger CASCADE;

CREATE VIEW view_vendor_ledger AS
SELECT
    row_number() over (order by date, created_at) as id,
    vendor_id,
    date,
    type,
    reference_number,
    description,
    credit_amount,
    debit_amount
FROM (
    -- A. Invoices
    SELECT
        vendor_id,
        received_date as date,
        created_at,
        'INVOICE' as type,
        vendor_invoice_number as reference_number,
        'Purchase Invoice #' || invoice_number as description,
        grand_total as credit_amount,
        0 as debit_amount
    FROM purchase_invoice_headers
    WHERE status != 'Cancelled'

    UNION ALL

    -- B. Payments
    SELECT
        vendor_id,
        payment_date as date,
        created_at,
        'PAYMENT' as type,
        transaction_ref as reference_number,
        'Payment via ' || payment_mode as description,
        0 as credit_amount,
        amount as debit_amount
    FROM vendor_payments
    WHERE is_active = true

    UNION ALL

    -- C. Debit Notes (Exclude Return Slips)
    SELECT
        vendor_id,
        debit_note_date as date,
        created_at,
        'DEBIT_NOTE' as type,
        debit_note_number as reference_number,
        'Debit Note: ' || reason as description,
        0 as credit_amount,
        amount as debit_amount
    FROM debit_notes
    WHERE status = 'Approved' AND note_type = 'Debit Note'
) as combined_data;
