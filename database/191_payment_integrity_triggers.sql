-- Migration: 191_payment_integrity_triggers
-- Purpose: Prevent over-utilization of payments at the database level

-- 1. Create the Validation Function
CREATE OR REPLACE FUNCTION fn_validate_payment_utilization()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_amount NUMERIC(15,2);
    v_total_utilized NUMERIC(15,2);
    v_payment_id BIGINT;
BEGIN
    -- Get Payment ID from the new row (works for both allocations and advances)
    v_payment_id := NEW.payment_id;

    -- Get Actual Payment Amount
    SELECT amount INTO v_payment_amount 
    FROM customer_payments 
    WHERE id = v_payment_id;

    -- If payment doesn't exist, something is wrong, but foreign keys should handle it
    IF v_payment_amount IS NULL THEN
        RETURN NEW;
    END IF;

    -- Calculate Total Utilized (Allocations + Advances)
    -- We filter for ACTIVE and PENDING statuses.
    v_total_utilized := (
        SELECT COALESCE(SUM(amount), 0) 
        FROM customer_payment_allocations 
        WHERE payment_id = v_payment_id AND status != 'REVERSED'
    ) + (
        SELECT COALESCE(SUM(amount), 0) 
        FROM customer_advances 
        WHERE payment_id = v_payment_id AND is_active = TRUE
    );

    -- Constraint Check (with 0.01 tolerance for rounding)
    IF v_total_utilized > v_payment_amount + 0.01 THEN
        RAISE EXCEPTION 'OVER_ALLOCATION_ERROR: Total utilized (₹%) exceeds actual payment amount (₹%) for Payment ID %', 
            v_total_utilized, v_payment_amount, v_payment_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach Trigger to customer_payment_allocations
DROP TRIGGER IF EXISTS trg_validate_payment_allocations ON customer_payment_allocations;
CREATE TRIGGER trg_validate_payment_allocations
AFTER INSERT OR UPDATE ON customer_payment_allocations
FOR EACH ROW EXECUTE FUNCTION fn_validate_payment_utilization();

-- 3. Attach Trigger to customer_advances
DROP TRIGGER IF EXISTS trg_validate_payment_advances ON customer_advances;
CREATE TRIGGER trg_validate_payment_advances
AFTER INSERT OR UPDATE ON customer_advances
FOR EACH ROW EXECUTE FUNCTION fn_validate_payment_utilization();

COMMENT ON FUNCTION fn_validate_payment_utilization IS 'Ensures SUM(Allocations) + SUM(Advances) <= Payment Amount';
