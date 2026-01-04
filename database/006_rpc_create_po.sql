-- Drop function if exists to allow updates
DROP FUNCTION IF EXISTS create_purchase_order;

CREATE OR REPLACE FUNCTION create_purchase_order(
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
    v_po_number TEXT;
    v_prefix TEXT;
    v_next_num INT;
    v_header_id INT;
    v_line JSONB;
BEGIN
    -- 1. Get and Increment Sequence (Atomic Lock)
    UPDATE document_sequences
    SET current_number = current_number + 1
    WHERE "Document_Type" = 'PO'
    RETURNING prefix, current_number INTO v_prefix, v_next_num;

    IF v_prefix IS NULL THEN
        RAISE EXCEPTION 'PO Sequence not found in document_sequences table';
    END IF;

    -- 2. Format PO Number (e.g., 'PO-2026-005')
    v_po_number := v_prefix || v_next_num;

    -- 3. Insert Header
    INSERT INTO purchase_order_headers (
        po_number, po_date, vendor_id, 
        total_net, total_qty, gst, total_taxable, 
        total_scheme, total_disc, remarks, status
    )
    VALUES (
        v_po_number, CURRENT_DATE, p_vendor_id,
        p_total_net, p_total_qty, p_gst, p_total_taxable,
        p_total_scheme, p_total_disc, p_remarks, 'Draft'
    )
    RETURNING id INTO v_header_id;

    -- 4. Insert Lines
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
            price
        )
        VALUES (
            v_header_id,
            (v_line->>'product_id')::INT,
            (v_line->>'product_name')::TEXT,
            (v_line->>'mrp')::NUMERIC,
            (v_line->>'ordered_qty')::NUMERIC,
            (v_line->>'scheme_amount')::NUMERIC,
            (v_line->>'discount_percent')::NUMERIC,
            (v_line->>'price')::NUMERIC
        );
    END LOOP;

    -- 5. Return Success
    RETURN jsonb_build_object(
        'success', true, 
        'po_number', v_po_number,
        'po_id', v_header_id
    );

EXCEPTION WHEN OTHERS THEN
    -- Transaction implicitly rolls back on error
    RAISE;
END;
$$;
