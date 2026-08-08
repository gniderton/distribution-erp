CREATE OR REPLACE FUNCTION public.old_auto_apply_advances_to_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.auto_apply_advances_to_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;
