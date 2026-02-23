-- Phase 107: Ledger & Sync Status Fix
-- 1. Add status to sync_logs
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sync_logs' AND column_name='status') THEN
        ALTER TABLE sync_logs ADD COLUMN status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Checked', 'Cancelled'));
    END IF;
END $$;

-- 2. Fix Customer Ledger View
-- Must include Invoices (Debit), Payments (Credit - Verified Only), and Returns (Credit - Applied Only)
CREATE OR REPLACE VIEW view_customer_ledger AS
SELECT
    row_number() over (order by date, created_at) as id,
    customer_id,
    date,
    type,
    reference_number,
    description,
    debit_amount,   -- Liability Increases (Bill/Charge)
    credit_amount,  -- Liability Decreases (Payment/Return)
    status
FROM (
    -- A. Sales Invoices (Debit)
    SELECT
        customer_id,
        invoice_date as date,
        created_at,
        'INVOICE' as type,
        invoice_number as reference_number,
        'Sales Invoice #' || invoice_number as description,
        grand_total as debit_amount,
        0 as credit_amount,
        status
    FROM sales_invoices
    WHERE status != 'Cancelled'

    UNION ALL

    -- B. Customer Payments (Credit)
    -- Logic: Only show Verified payments in the financial ledger
    SELECT
        customer_id,
        payment_date as date,
        created_at,
        'PAYMENT' as type,
        coalesce(transaction_ref, 'Cash') as reference_number,
        'Payment (' || payment_mode || ')' as description,
        0 as debit_amount,
        amount as credit_amount,
        verification_status as status
    FROM customer_payments
    WHERE is_active = true 
      AND verification_status = 'Verified'

    UNION ALL

    -- C. Sales Returns (Credit)
    -- Logic: Only show Applied returns (Credit Notes)
    SELECT
        customer_id,
        return_date as date,
        created_at,
        'RETURN' as type,
        return_number as reference_number,
        type || ' #' || return_number as description,
        0 as debit_amount,
        grand_total as credit_amount,
        status
    FROM sales_returns
    WHERE is_active = true 
      AND status = 'Applied'
) as combined_data;
