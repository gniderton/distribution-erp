 SELECT row_number() OVER (ORDER BY date, created_at) AS id,
    vendor_id,
    date,
    created_at,
    type,
    reference_number,
    description,
    credit_amount,
    debit_amount
   FROM ( SELECT purchase_invoice_headers.vendor_id,
            purchase_invoice_headers.received_date AS date,
            purchase_invoice_headers.created_at,
            'INVOICE'::text AS type,
            purchase_invoice_headers.vendor_invoice_number AS reference_number,
            ('Purchase Invoice #'::text || purchase_invoice_headers.invoice_number) AS description,
            purchase_invoice_headers.grand_total AS credit_amount,
            0 AS debit_amount
           FROM purchase_invoice_headers
          WHERE (purchase_invoice_headers.status <> 'Cancelled'::text)
        UNION ALL
         SELECT vendor_payments.vendor_id,
            vendor_payments.payment_date AS date,
            vendor_payments.created_at,
            'PAYMENT'::text AS type,
            vendor_payments.transaction_ref AS reference_number,
            ('Payment via '::text || vendor_payments.payment_mode) AS description,
            0 AS credit_amount,
            vendor_payments.amount AS debit_amount
           FROM vendor_payments
          WHERE (vendor_payments.is_active = true)
        UNION ALL
         SELECT debit_notes.vendor_id,
            debit_notes.debit_note_date AS date,
            debit_notes.created_at,
            'DEBIT_NOTE'::text AS type,
            debit_notes.debit_note_number AS reference_number,
            ('Debit Note: '::text || debit_notes.reason) AS description,
            0 AS credit_amount,
            debit_notes.amount AS debit_amount
           FROM debit_notes
          WHERE ((debit_notes.status = 'Approved'::text) AND (debit_notes.note_type = 'Debit Note'::text))) combined_data;