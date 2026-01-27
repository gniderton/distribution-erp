-- 1. Create Company Settings Table
CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    company_name TEXT NOT NULL DEFAULT 'My Company',
    gstin TEXT,
    state_code INTEGER NOT NULL DEFAULT 32, -- Default Kerala
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Seed Default Settings (If Empty)
INSERT INTO company_settings (company_name, gstin, state_code)
SELECT 'Distribution Company', '32AAAAA0000A1Z5', 32
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- 3. Update GRN Function for Smart Tax Logic
CREATE OR REPLACE FUNCTION create_purchase_invoice(
    p_vendor_id bigint,
    p_po_id bigint,
    p_vendor_invoice_number text,
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
    v_line_id bigint;
    v_internal_id text;
    v_prefix text;
    v_next_num bigint;
    
    -- Accounting Variables
    v_ledger_lines jsonb := '[]'::jsonb;
    
    v_acc_inventory int := 1001;
    v_acc_gst_igst  int := 1010;
    v_acc_gst_cgst  int := 1011;
    v_acc_gst_sgst  int := 1012;
    v_acc_payable   int := 2001;
    v_acc_rounding  int := 5003; 

    v_gst_cgst_amt numeric := 0;
    v_gst_sgst_amt numeric := 0;
    
    v_total_debit numeric := 0;
    v_total_credit numeric := 0;
    v_diff numeric := 0;

    -- GST Logic
    v_vendor_gst text;
    v_vendor_state_code int;
    v_company_state_code int;
    v_is_intra_state boolean := false; 
BEGIN
    -- 0. Fetch GST Details
    SELECT gst INTO v_vendor_gst FROM vendors WHERE id = p_vendor_id;
    SELECT state_code INTO v_company_state_code FROM company_settings LIMIT 1;

    -- Default to 32 if missing
    IF v_company_state_code IS NULL THEN v_company_state_code := 32; END IF;

    -- Extract Vendor State Code (First 2 chars of GST)
    -- If GST is missing or short, assume INTER-STATE (IGST) for safety, or INTRA? 
    -- Let's default to INTRA (Local) if unknown, OR INTER. 
    -- Standard practice: If no GST, user is Unregistered. We treat as Local usually?
    -- Logic: Try to parse.
    IF v_vendor_gst IS NOT NULL AND LENGTH(v_vendor_gst) >= 2 THEN
        BEGIN
            v_vendor_state_code := SUBSTRING(v_vendor_gst, 1, 2)::int;
        EXCEPTION WHEN OTHERS THEN
            v_vendor_state_code := 0; -- Create fail safe
        END;
    END IF;

    -- Compare
    IF v_vendor_state_code = v_company_state_code THEN
        v_is_intra_state := true;
    END IF;

    -- 1. Generate Internal ID
    SELECT prefix, current_number INTO v_prefix, v_next_num 
    FROM document_sequences 
    WHERE document_type = 'GRN' FOR UPDATE; 

    IF NOT FOUND THEN RAISE EXCEPTION 'Sequence for GRN not found'; END IF;

    v_next_num := v_next_num + 1;
    v_internal_id := v_prefix || v_next_num;

    UPDATE document_sequences SET current_number = v_next_num WHERE document_type = 'GRN';

    -- 2. Insert Header
    INSERT INTO purchase_invoice_headers (
        vendor_id, purchase_order_id, invoice_number, 
        vendor_invoice_number, vendor_invoice_date, received_date,
        total_net, tax_amount, grand_total, status,
        parent_invoice_id, created_by
    )
    VALUES (
        p_vendor_id, 
        (CASE WHEN p_po_id = 0 THEN NULL ELSE p_po_id END), 
        v_internal_id, p_vendor_invoice_number, p_invoice_date, p_received_date,
        p_total_net, p_tax_amount, p_grand_total, 'Verified',
        p_parent_id, 1
    )
    RETURNING id INTO v_header_id;

    -- 2b. Auto-Update PO
    IF p_po_id IS NOT NULL AND p_po_id > 0 THEN
        UPDATE purchase_order_headers SET status = 'Received' WHERE id = p_po_id;
    END IF;

    -- 3. Process Lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines_json)
    LOOP
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

        -- Create Inventory Batch
        INSERT INTO inventory_batches (
            product_id, grn_id, purchase_invoice_line_id, batch_code,
            mrp, purchase_rate,
            distributor_rate, wholesale_rate, dealer_rate, retail_rate, 
            quantity_initial, quantity_remaining,
            expiry_date, is_active
        )
        SELECT
            (v_line->>'product_id')::bigint, v_header_id, v_line_id, (v_line->>'batch_number'),
            (v_line->>'mrp')::numeric, (v_line->>'rate')::numeric,
            p.distributor_rate, p.wholesale_rate, p.dealer_rate, p.retail_rate, 
            (v_line->>'accepted_qty')::numeric, (v_line->>'accepted_qty')::numeric,
            (v_line->>'expiry_date')::date, true
        FROM products p
        WHERE p.id = (v_line->>'product_id')::bigint;
    END LOOP;

    -- 4. Create ACCOUNTING ENTRIES (Journal)
    v_total_debit := p_total_net;
    
    -- Debit Inventory
    v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_inventory, 'debit', p_total_net, 'credit', 0);

    -- Debit Tax
    IF p_tax_amount > 0 THEN
         IF v_is_intra_state THEN
             -- LOCAL: Split 50/50
             v_gst_cgst_amt := p_tax_amount / 2;
             v_gst_sgst_amt := p_tax_amount / 2;
             
             v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_cgst, 'debit', v_gst_cgst_amt, 'credit', 0);
             v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_sgst, 'debit', v_gst_sgst_amt, 'credit', 0);
             
             v_total_debit := v_total_debit + v_gst_cgst_amt + v_gst_sgst_amt;
         ELSE
             -- INTER-STATE: All IGST
             v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_igst, 'debit', p_tax_amount, 'credit', 0);
             v_total_debit := v_total_debit + p_tax_amount;
         END IF;
    END IF;

    -- Credit Accounts Payable
    v_total_credit := p_grand_total;
    v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_payable, 'debit', 0, 'credit', p_grand_total);

    -- Calculate Rounding Difference
    v_diff := v_total_debit - v_total_credit;

    IF v_diff != 0 THEN
        IF v_diff > 0 THEN
            -- Debits > Credits. Need Cr.
            v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_rounding, 'debit', 0, 'credit', v_diff);
        ELSE
            -- Credits > Debits. Need Dr.
            v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_rounding, 'debit', ABS(v_diff), 'credit', 0);
        END IF;
    END IF;

    -- Post Entry
    PERFORM create_journal_entry(
        p_invoice_date, 
        'GRN Inwarding: ' || v_internal_id, 
        'GRN', 
        v_header_id, 
        v_ledger_lines
    );

    RETURN jsonb_build_object('success', true, 'id', v_header_id);
END;
$function$;
