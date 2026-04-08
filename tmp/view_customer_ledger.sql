 SELECT row_number() OVER (ORDER BY date, created_at) AS id,
    customer_id,
    date,
    type,
    reference_number,
    description,
    debit_amount,
    credit_amount,
    status
   FROM ( SELECT sales_invoices.customer_id,
            sales_invoices.invoice_date AS date,
            sales_invoices.created_at,
            'INVOICE'::text AS type,
            sales_invoices.invoice_number AS reference_number,
            ('Sales Invoice #'::text || sales_invoices.invoice_number) AS description,
            sales_invoices.grand_total AS debit_amount,
            0 AS credit_amount,
            sales_invoices.status
           FROM sales_invoices
          WHERE (sales_invoices.status <> 'Cancelled'::text)
        UNION ALL
         SELECT customer_payments.customer_id,
            customer_payments.payment_date AS date,
            customer_payments.created_at,
            'PAYMENT'::text AS type,
            COALESCE(customer_payments.transaction_ref, 'Cash'::text) AS reference_number,
            (('Payment ('::text || customer_payments.payment_mode) || ')'::text) AS description,
            0 AS debit_amount,
            customer_payments.amount AS credit_amount,
            customer_payments.verification_status AS status
           FROM customer_payments
          WHERE ((customer_payments.is_active = true) AND ((customer_payments.verification_status)::text = 'Verified'::text))
        UNION ALL
         SELECT sales_returns.customer_id,
            sales_returns.return_date AS date,
            sales_returns.created_at,
            'RETURN'::text AS type,
            sales_returns.return_number AS reference_number,
            ((sales_returns.type || ' #'::text) || sales_returns.return_number) AS description,
            0 AS debit_amount,
            sales_returns.grand_total AS credit_amount,
            sales_returns.status
           FROM sales_returns
          WHERE ((sales_returns.is_active = true) AND (sales_returns.status = 'Applied'::text))) combined_data;