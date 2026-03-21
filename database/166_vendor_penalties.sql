-- 166_vendor_penalties.sql

-- 1. Create Vendor Penalties Table
CREATE TABLE IF NOT EXISTS vendor_penalties (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() not null,
    vendor_id BIGINT NOT NULL REFERENCES vendors(id),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    penalty_date DATE NOT NULL DEFAULT CURRENT_DATE,
    penalty_number TEXT UNIQUE,
    cheque_id INTEGER REFERENCES cheques(id),
    remarks TEXT
);

-- 2. Redefine view_vendor_ledger to include Vendor Penalties
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

    -- C. Debit Notes
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
    WHERE (status = 'Approved' OR status = 'Applied')

    UNION ALL

    -- D. Vendor Penalties (Credit Note - Liability increases)
    SELECT
        vendor_id,
        penalty_date as date,
        created_at,
        'VENDOR_PENALTY' as type,
        penalty_number as reference_number,
        'Cheque Bounce Penalty: ' || remarks as description,
        amount as credit_amount,
        0 as debit_amount
    FROM vendor_penalties
) as combined_data;
