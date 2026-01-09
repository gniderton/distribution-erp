-- Add transaction_type to vendor_payments
ALTER TABLE vendor_payments 
ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'PAYMENT' CHECK (transaction_type IN ('PAYMENT', 'REFUND'));

-- Update Ledger View to handle REFUNDs
DROP VIEW IF EXISTS view_vendor_ledger CASCADE;
CREATE OR REPLACE VIEW view_vendor_ledger AS
SELECT
    row_number() over (order by date, created_at) as id,
    vendor_id,
    date,
    created_at, -- Expose this for sorting
    type,
    reference_number,
    description,
    credit_amount, -- We owe them (Bills + Refunds received)
    debit_amount   -- We paid them (Payments + Returns)
FROM (
    -- A. Invoices (Credit)
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

    -- B. Payments (Debit)
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
    WHERE is_active = true AND transaction_type = 'PAYMENT'
    
    UNION ALL

    -- NEW: Refunds/Receipts (Credit - Increases our "Liability" relative to the Debit created by a Return/Bonus)
    -- Wait, if they pay us 50,000 bonus.
    -- To settle the "Debit Note" (Dr), we receive "Refund" (Cr).
    SELECT
        vendor_id,
        payment_date as date,
        created_at,
        'REFUND' as type,
        transaction_ref as reference_number,
        'Receipt via ' || payment_mode as description,
        amount as credit_amount, -- Treated like a Bill (Credit Side)
        0 as debit_amount
    FROM vendor_payments
    WHERE is_active = true AND transaction_type = 'REFUND'

    UNION ALL

    -- C. Debit Notes (Debit)
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
    WHERE status = 'Approved'
) as combined_data;
