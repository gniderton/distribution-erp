-- Migration: Auto-Apply Advances to New Invoices
-- Purpose: Automatically utilize customer advances when new invoices are created

-- Function to auto-apply advances to new invoice
CREATE OR REPLACE FUNCTION auto_apply_advances_to_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_advance RECORD;
    v_invoice_balance NUMERIC;
    v_apply_amount NUMERIC;
BEGIN
    -- Only process if invoice is not cancelled
    IF NEW.status = 'Cancelled' THEN
        RETURN NEW;
    END IF;

    -- Calculate invoice balance
    v_invoice_balance := NEW.grand_total - COALESCE(NEW.amount_paid, 0);

    -- Skip if invoice already fully paid
    IF v_invoice_balance <= 0 THEN
        RETURN NEW;
    END IF;

    -- Get available advances for this customer (FIFO)
    FOR v_advance IN 
        SELECT id, balance
        FROM customer_advances
        WHERE customer_id = NEW.customer_id 
          AND is_active = TRUE 
          AND balance > 0
        ORDER BY created_at ASC
    LOOP
        EXIT WHEN v_invoice_balance <= 0;

        -- Calculate amount to apply
        v_apply_amount := LEAST(v_advance.balance, v_invoice_balance);

        -- Create utilization record
        INSERT INTO advance_utilizations (
            advance_id, invoice_id, amount
        ) VALUES (
            v_advance.id, NEW.id, v_apply_amount
        );

        -- Update advance balance
        UPDATE customer_advances
        SET balance = balance - v_apply_amount,
            updated_at = NOW()
        WHERE id = v_advance.id;

        -- Update invoice
        UPDATE sales_invoices
        SET amount_paid = COALESCE(amount_paid, 0) + v_apply_amount,
            status = CASE 
                WHEN (grand_total - (COALESCE(amount_paid, 0) + v_apply_amount)) <= 1 THEN 'Paid'
                WHEN (COALESCE(amount_paid, 0) + v_apply_amount) > 0 THEN 'Partially Paid'
                ELSE status
            END
        WHERE id = NEW.id;

        -- Reduce remaining balance
        v_invoice_balance := v_invoice_balance - v_apply_amount;

        -- Deactivate advance if fully utilized
        IF v_advance.balance - v_apply_amount <= 0.01 THEN
            UPDATE customer_advances
            SET is_active = FALSE
            WHERE id = v_advance.id;
        END IF;
    END LOOP;

    -- Refresh NEW to get updated values
    SELECT * INTO NEW FROM sales_invoices WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on sales_invoices
DROP TRIGGER IF EXISTS trigger_auto_apply_advances ON sales_invoices;

CREATE TRIGGER trigger_auto_apply_advances
    AFTER INSERT ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION auto_apply_advances_to_invoice();

COMMENT ON FUNCTION auto_apply_advances_to_invoice() IS 
'Automatically applies customer advances to new invoices in FIFO order. Creates utilization records and updates invoice status.';

-- Create view for advance utilization tracking
CREATE OR REPLACE VIEW view_advance_utilizations AS
SELECT 
    au.id,
    au.advance_id,
    ca.customer_id,
    c.customer_name,
    cp.payment_number,
    cp.payment_date,
    ca.amount as advance_total,
    au.invoice_id,
    si.invoice_number,
    si.invoice_date,
    au.amount as utilized_amount,
    au.created_at as utilized_at
FROM advance_utilizations au
JOIN customer_advances ca ON au.advance_id = ca.id
JOIN customers c ON ca.customer_id = c.id
JOIN customer_payments cp ON ca.payment_id = cp.id
JOIN sales_invoices si ON au.invoice_id = si.id
ORDER BY au.created_at DESC;

COMMENT ON VIEW view_advance_utilizations IS 
'Shows all advance utilizations with customer, payment, and invoice details';
