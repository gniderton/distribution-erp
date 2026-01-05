-- Drop function if exists
DROP FUNCTION IF EXISTS update_purchase_order;

CREATE OR REPLACE FUNCTION update_purchase_order(
    p_header_id INT,
    p_vendor_id INT,
    p_total_net NUMERIC,
    p_total_qty NUMERIC,
    p_gst NUMERIC,
    p_total_taxable NUMERIC,
    p_total_scheme NUMERIC,
    p_total_disc NUMERIC,
    p_remarks TEXT,
    p_lines JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_status TEXT;
    v_line JSONB;
BEGIN
    -- 1. Check Status (Must be Draft)
    SELECT status INTO v_status 
    FROM purchase_order_headers 
    WHERE id = p_header_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Purchase Order ID % not found', p_header_id;
    END IF;

    IF v_status != 'Draft' THEN
        RAISE EXCEPTION 'Cannot edit Purchase Order in % status', v_status;
    END IF;

    -- 2. Update Header
    UPDATE purchase_order_headers
    SET 
        vendor_id = p_vendor_id,
        total_net = p_total_net,
        total_qty = p_total_qty,
        gst = p_gst,
        total_taxable = p_total_taxable,
        total_scheme = p_total_scheme,
        total_disc = p_total_disc,
        remarks = p_remarks,
        po_date = CURRENT_DATE -- Optional: Update date on edit? Or keep original? Let's update it.
    WHERE id = p_header_id;

    -- 3. Delete Old Lines (Full Refresh Strategy)
    DELETE FROM purchase_order_lines 
    WHERE purchase_order_header_id = p_header_id;

    -- 4. Insert New Lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        INSERT INTO purchase_order_lines (
            purchase_order_header_id,
            product_id,
            product_name,
            mrp,
            ordered_qty,
            scheme_amount,
            discount_percent,
            rate,
            tax_amount,   
            amount       
        )
        VALUES (
            p_header_id,
            (v_line->>'product_id')::INT,
            (v_line->>'product_name')::TEXT,
            (v_line->>'mrp')::NUMERIC,
            (v_line->>'ordered_qty')::NUMERIC,
            (v_line->>'scheme_amount')::NUMERIC,
            (v_line->>'discount_percent')::NUMERIC,
            (v_line->>'price')::NUMERIC,
            (v_line->>'tax_amount')::NUMERIC, 
            (v_line->>'amount')::NUMERIC      
        );
    END LOOP;

    -- 5. Return Success
    RETURN jsonb_build_object(
        'success', true, 
        'po_id', p_header_id
    );

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;
