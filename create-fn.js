const { pool } = require('./config/db');

const sql = `
CREATE OR REPLACE FUNCTION fn_apply_advances_to_invoice(p_invoice_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_advance RECORD;
    v_invoice_balance NUMERIC;
    v_apply_amount NUMERIC;
    v_customer_id BIGINT;
    v_grand_total NUMERIC;
    v_amount_paid NUMERIC;
    v_status VARCHAR;
BEGIN
    -- Get invoice details
    SELECT customer_id, grand_total, COALESCE(amount_paid, 0), status 
    INTO v_customer_id, v_grand_total, v_amount_paid, v_status
    FROM sales_invoices
    WHERE id = p_invoice_id;

    -- Only process if invoice is not cancelled
    IF v_status = 'Cancelled' THEN
        RETURN;
    END IF;

    -- Calculate invoice balance
    v_invoice_balance := v_grand_total - v_amount_paid;

    -- Skip if invoice already fully paid
    IF v_invoice_balance <= 0 THEN
        RETURN;
    END IF;

    -- Get available advances for this customer (FIFO)
    FOR v_advance IN 
        SELECT id, balance
        FROM customer_advances
        WHERE customer_id = v_customer_id 
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
            v_advance.id, p_invoice_id, v_apply_amount
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
        WHERE id = p_invoice_id;

        -- Reduce remaining balance
        v_invoice_balance := v_invoice_balance - v_apply_amount;

        -- Deactivate advance if fully utilized
        IF v_advance.balance - v_apply_amount <= 0.01 THEN
            UPDATE customer_advances
            SET is_active = FALSE
            WHERE id = v_advance.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
`;

(async () => {
  try {
    await pool.query(sql);
    console.log('Function fn_apply_advances_to_invoice created successfully.');
  } catch (err) {
    console.error('Error creating function:', err.message);
  } finally {
    process.exit(0);
  }
})();
