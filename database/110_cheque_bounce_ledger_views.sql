-- Migration: Add cheque bounce entries to customer and vendor ledger views
-- Run Date: 2026-04-06

-- ============================================================
-- 1. Customer Ledger View
-- Bounced INCOMING cheques appear as DEBIT (money owed again)
-- ============================================================
DROP VIEW IF EXISTS view_customer_ledger;
CREATE VIEW view_customer_ledger AS
SELECT 
    row_number() OVER (ORDER BY date, created_at) AS id,
    customer_id,
    date,
    type,
    reference_number,
    description,
    debit_amount,
    credit_amount,
    status
FROM (
    -- Invoices
    SELECT 
        customer_id,
        invoice_date AS date,
        created_at,
        'INVOICE' AS type,
        invoice_number AS reference_number,
        ('Sales Invoice #' || invoice_number) AS description,
        grand_total AS debit_amount,
        0 AS credit_amount,
        status
    FROM sales_invoices
    WHERE status <> 'Cancelled'

    UNION ALL

    -- Payments
    SELECT 
        customer_id,
        payment_date AS date,
        created_at,
        'PAYMENT' AS type,
        COALESCE(transaction_ref, 'Cash') AS reference_number,
        ('Payment (' || payment_mode || ')') AS description,
        0 AS debit_amount,
        amount AS credit_amount,
        verification_status AS status
    FROM customer_payments
    WHERE is_active = true AND verification_status = 'Verified'

    UNION ALL

    -- Returns / Credit Notes
    SELECT 
        customer_id,
        return_date AS date,
        created_at,
        'RETURN' AS type,
        return_number AS reference_number,
        (type || ' #' || return_number) AS description,
        0 AS debit_amount,
        grand_total AS credit_amount,
        status
    FROM sales_returns
    WHERE is_active = true AND status = 'Applied'

    UNION ALL

    -- Bounced Cheques (incoming from customer — re-opens their balance)
    SELECT
        party_id AS customer_id,
        COALESCE(bounce_date, updated_at::date) AS date,
        updated_at AS created_at,
        'CHEQUE_BOUNCE' AS type,
        cheque_number AS reference_number,
        ('Cheque Bounce: ' || cheque_number || COALESCE(' - ' || remarks, '')) AS description,
        amount AS debit_amount,
        0 AS credit_amount,
        'BOUNCED' AS status
    FROM cheques
    WHERE status = 'BOUNCED' AND type = 'INCOMING' AND party_type = 'CUSTOMER'

) combined_data;


-- ============================================================
-- 2. Vendor Ledger View
-- Bounced OUTGOING cheques appear as CREDIT (liability restored)
-- ============================================================
DROP VIEW IF EXISTS view_vendor_ledger;
CREATE VIEW view_vendor_ledger AS
SELECT 
    row_number() OVER (ORDER BY date, created_at) AS id,
    vendor_id,
    date,
    type,
    reference_number,
    description,
    debit_amount,
    credit_amount
FROM (
    -- Purchase Invoices (Bills)
    SELECT 
        vendor_id,
        received_date AS date,
        created_at,
        'INVOICE' AS type,
        vendor_invoice_number AS reference_number,
        ('Purchase Invoice #' || invoice_number) AS description,
        0 AS debit_amount,
        grand_total AS credit_amount
    FROM purchase_invoice_headers
    WHERE status <> 'Cancelled'

    UNION ALL

    -- Vendor Payments
    SELECT 
        vendor_id,
        payment_date AS date,
        created_at,
        'PAYMENT' AS type,
        transaction_ref AS reference_number,
        ('Payment via ' || payment_mode) AS description,
        0 AS credit_amount,
        amount AS debit_amount
    FROM vendor_payments
    WHERE is_active = true

    UNION ALL

    -- Debit Notes
    SELECT 
        vendor_id,
        debit_note_date AS date,
        created_at,
        'DEBIT_NOTE' AS type,
        debit_note_number AS reference_number,
        ('Debit Note: ' || reason) AS description,
        0 AS credit_amount,
        amount AS debit_amount
    FROM debit_notes
    WHERE status = 'Approved' AND note_type = 'Debit Note'

    UNION ALL

    -- Bounced Outgoing Cheques (cheque to vendor bounced — liability restored)
    SELECT
        party_id AS vendor_id,
        COALESCE(bounce_date, updated_at::date) AS date,
        updated_at AS created_at,
        'CHEQUE_BOUNCE' AS type,
        cheque_number AS reference_number,
        ('Cheque Bounce: ' || cheque_number || COALESCE(' - ' || remarks, '')) AS description,
        0 AS debit_amount,
        amount AS credit_amount
    FROM cheques
    WHERE status = 'BOUNCED' AND type = 'OUTGOING' AND party_type = 'VENDOR'

) combined_data;
