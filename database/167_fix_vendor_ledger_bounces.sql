-- 167_fix_vendor_ledger_bounces.sql

-- 1. Redefine view_vendor_ledger
DROP VIEW IF EXISTS view_vendor_ledger CASCADE;

CREATE VIEW view_vendor_ledger AS
SELECT
    row_number() over (order by date, created_at) as id,
    vendor_id,
    date,
    created_at,
    type,
    reference_number,
    description,
    credit_amount,
    debit_amount
FROM (
    -- A. Invoices (Credit - Liability increases)
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

    -- B. Payments (Debit - Liability decreases)
    SELECT
        vendor_id,
        payment_date as date,
        created_at,
        'PAYMENT' as type,
        transaction_ref as reference_number,
        ('Payment via ' || payment_mode) as description,
        0 as credit_amount,
        amount as debit_amount
    FROM vendor_payments
    WHERE is_active = true

    UNION ALL

    -- C. Debit Notes (Debit - Liability decreases)
    SELECT
        vendor_id,
        debit_note_date as date,
        created_at,
        'DEBIT_NOTE' as type,
        debit_note_number as reference_number,
        ('Debit Note: ' || reason) as description,
        0 as credit_amount,
        amount as debit_amount
    FROM debit_notes
    WHERE (status = 'Approved' OR status = 'Applied')

    UNION ALL

    -- D. Vendor Penalties (Credit - Liability increases)
    -- This picks up the charges vendor levied for the bounce
    SELECT
        vendor_id,
        penalty_date as date,
        created_at,
        'VENDOR_PENALTY' as type,
        penalty_number as reference_number,
        ('Bounce Charge: ' || COALESCE(remarks, '')) as description,
        amount as credit_amount,
        0 as debit_amount
    FROM vendor_penalties

    UNION ALL

    -- E. Bounced Outgoing Cheques (Credit - Liability increases back)
    -- This reverses the payment that failed
    SELECT
        party_id as vendor_id,
        updated_at::date as date,
        updated_at as created_at,
        'CHQ_BOUNCE' as type,
        cheque_number as reference_number,
        ('Reversal: Bounced Cheque ' || cheque_number) as description,
        amount as credit_amount,
        0 as debit_amount
    FROM cheques
    WHERE status = 'BOUNCED' AND type = 'OUTGOING' AND party_type = 'VENDOR'
) as combined_data;
