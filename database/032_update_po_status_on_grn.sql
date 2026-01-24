DROP FUNCTION IF EXISTS create_purchase_invoice(bigint,bigint,text,date,date,numeric,numeric,numeric,jsonb,bigint);

CREATE OR REPLACE FUNCTION create_purchase_invoice(
    p_vendor_id bigint,
    p_po_id bigint,
    p_vendor_invoice_number text, -- Renamed from p_invoice_number to be explicit
    p_invoice_date date,
    p_received_date date,
    p_total_net numeric,
    p_tax_amount numeric,
    p_grand_total numeric,
    p_lines_json jsonb,
    p_parent_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_header_id bigint;
    v_line jsonb;
    v_batch_no text;
    v_line_id bigint;
    v_internal_id text;
    v_prefix text;
    v_next_num bigint;
    v_year text;
BEGIN
    -- 1. Generate Internal ID from Document Sequence
    SELECT prefix, current_number INTO v_prefix, v_next_num 
    FROM document_sequences 
    WHERE document_type = 'GRN' FOR UPDATE; -- Lock to prevent race conditions

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sequence for GRN not found in document_sequences';
    END IF;

    v_next_num := v_next_num + 1;
    -- Format: Prefix + Number (e.g. GD-CLT-GRN-26-1)
    v_internal_id := v_prefix || v_next_num;

    -- Update Sequence
    UPDATE document_sequences SET current_number = v_next_num WHERE document_type = 'GRN';

    -- 2. Insert Header
    INSERT INTO purchase_invoice_headers (
        vendor_id, purchase_order_id, invoice_number, 
        vendor_invoice_number, vendor_invoice_date, received_date,
        total_net, tax_amount, grand_total, status,
        parent_invoice_id,
        created_by
    )
    VALUES (
        p_vendor_id, 
        (CASE WHEN p_po_id = 0 THEN NULL ELSE p_po_id END), 
        v_internal_id, -- Use generated Sequence ID
        p_vendor_invoice_number, 
        p_invoice_date, 
        p_received_date,
        p_total_net, p_tax_amount, p_grand_total, 'Verified',
        p_parent_id,
        1
    )
    RETURNING id INTO v_header_id;

    -- Removed old sub-update logic



    -- 2. Auto-Update PO Status (New Logic)
    IF p_po_id IS NOT NULL AND p_po_id > 0 THEN
        UPDATE purchase_order_headers 
        SET status = 'Received'
        WHERE id = p_po_id;
    END IF;

    -- 3. Process Lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines_json)
    LOOP
        -- Insert Line
        INSERT INTO purchase_invoice_lines (
            purchase_invoice_header_id, product_id, 
            ordered_qty, accepted_qty, 
            rate, discount_percent, scheme_amount, tax_amount, amount
        )
        VALUES (
            v_header_id, (v_line->>'product_id')::bigint,
            (v_line->>'ordered_qty')::numeric, (v_line->>'accepted_qty')::numeric,
            (v_line->>'rate')::numeric, (v_line->>'discount_percent')::numeric, 
            (v_line->>'scheme_amount')::numeric, (v_line->>'tax_amount')::numeric, 
            (v_line->>'amount')::numeric
        )
        RETURNING id INTO v_line_id;

        -- Create Inventory Batch (FIFO) - REPLACING product_batches
        INSERT INTO inventory_batches (
            product_id, grn_id, purchase_invoice_line_id, batch_code,
            mrp, purchase_rate,
            quantity_initial, quantity_remaining,
            expiry_date, is_active
        )
        VALUES (
            (v_line->>'product_id')::bigint, v_header_id, v_line_id, (v_line->>'batch_number'),
            (v_line->>'mrp')::numeric, (v_line->>'rate')::numeric,
            (v_line->>'accepted_qty')::numeric, (v_line->>'accepted_qty')::numeric,
            (v_line->>'expiry_date')::date, true
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'id', v_header_id);
END;
$function$;
