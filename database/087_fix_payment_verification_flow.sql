-- Migration: Fix Payment Verification Flow
-- Purpose: Separate payment creation from verification, defer accounting until verified

-- 1. Ensure verification_status column exists (should already exist from migration 056)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customer_payments' 
                   AND column_name = 'verification_status') THEN
        ALTER TABLE customer_payments 
        ADD COLUMN verification_status VARCHAR(20) DEFAULT 'Pending' 
        CHECK (verification_status IN ('Pending', 'Verified', 'Rejected'));
    END IF;
END $$;

-- 2. Migrate existing payments to 'Verified' status
-- Rationale: Existing payments were created with immediate allocation/GL posting,
-- so they are effectively "verified" already. This prevents breaking existing data.
UPDATE customer_payments 
SET verification_status = 'Verified',
    verified_at = COALESCE(verified_at, created_at),
    verified_by = COALESCE(verified_by, collected_by)
WHERE verification_status IS NULL 
   OR verification_status = 'Pending';

-- 3. Add index for performance on verification queries
CREATE INDEX IF NOT EXISTS idx_cp_verification_status 
ON customer_payments(verification_status);

-- 4. Update view_customer_ledger to only show verified payments
CREATE OR REPLACE VIEW view_customer_ledger AS
SELECT
    row_number() over (order by date, created_at) as id,
    customer_id,
    date,
    type,
    reference_number,
    description,
    debit_amount,
    credit_amount,
    status
FROM (
    -- A. Sales Invoices (Debit: They Owe Us)
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

    -- B. Customer Payments (Credit: They Paid Us)
    -- [CHANGED] Only include VERIFIED payments in ledger
    SELECT
        customer_id,
        payment_date as date,
        created_at,
        'PAYMENT' as type,
        coalesce(transaction_ref, 'Cash') as reference_number,
        'Payment (' || payment_mode || ')' as description,
        0 as debit_amount,
        amount as credit_amount,
        verification_status as status  -- Show verification status, not payment status
    FROM customer_payments
    WHERE is_active = true
      AND verification_status = 'Verified'  -- [NEW] Only show verified payments
) as combined_data;

-- 5. Add comment for documentation
COMMENT ON COLUMN customer_payments.verification_status IS 
'Finance verification status: Pending (awaiting verification), Verified (approved and allocated), Rejected (reversed)';
