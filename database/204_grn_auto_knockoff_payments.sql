-- Migration 204: Implement Auto-Knockoff for Hanging Payments (Advances) on GRN

DROP FUNCTION IF EXISTS public.create_purchase_invoice(bigint, bigint, text, date, date, numeric, numeric, numeric, jsonb, bigint);

CREATE OR REPLACE FUNCTION public.create_purchase_invoice(
    p_vendor_id             bigint,
    p_purchase_order_id     bigint,
    p_invoice_number        text,
    p_invoice_date          date,
    p_received_date         date,
    p_total_taxable         numeric,
    p_tax_amount            numeric,
    p_grand_total           numeric,
    p_order_lines           jsonb,
    p_parent_invoice_id     bigint DEFAULT NULL::bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
    v_gst_igst_amt numeric := 0;
    
    v_total_debit numeric := 0;
    v_total_credit numeric := 0;
    v_diff numeric := 0;
    v_batch_id bigint;

    -- GST Logic
    v_vendor_gst text;
    v_vendor_state_code int;
    v_company_state_code int;
    v_is_intra_state boolean := false; 
    v_pos text := '32'; -- Default POS

    -- Auto-Knockoff Variables
    v_dn record;
    v_pay record;
    v_grn_balance numeric := p_grand_total;
    v_apply numeric;
BEGIN
    -- 0. Fetch GST Details
    SELECT gst INTO v_vendor_gst FROM vendors WHERE id = p_vendor_id;
    SELECT state_code INTO v_company_state_code FROM company_settings LIMIT 1;

    -- Default to 32 if missing
    IF v_company_state_code IS NULL THEN v_company_state_code := 32; END IF;
    
    -- Parse Vendor State
    IF v_vendor_gst IS NOT NULL AND LENGTH(v_vendor_gst) >= 2 THEN
        BEGIN
            v_vendor_state_code := SUBSTRING(v_vendor_gst, 1, 2)::int;
            v_pos := SUBSTRING(v_vendor_gst, 1, 2);
        EXCEPTION WHEN OTHERS THEN
            v_vendor_state_code := 0;
        END;
    END IF;

    -- Compare state codes
    IF v_vendor_state_code = v_company_state_code THEN
        v_is_intra_state := true;
    END IF;

    -- Calculate Tax Split
    IF p_tax_amount > 0 THEN
        IF v_is_intra_state THEN
            v_gst_cgst_amt := p_tax_amount / 2;
            v_gst_sgst_amt := p_tax_amount / 2;
        ELSE
            v_gst_igst_amt := p_tax_amount;
        END IF;
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
        parent_invoice_id, created_by,
        -- GST Cols
        taxable_amount, cgst_amount, sgst_amount, igst_amount, place_of_supply
    )
    VALUES (
        p_vendor_id, 
        (CASE WHEN p_purchase_order_id = 0 THEN NULL ELSE p_purchase_order_id END), 
        v_internal_id, p_invoice_number, p_invoice_date, p_received_date,
        p_total_taxable, p_tax_amount, p_grand_total, 'Verified',
        p_parent_invoice_id, 1,
        -- GST Vals
        p_total_taxable, v_gst_cgst_amt, v_gst_sgst_amt, v_gst_igst_amt, v_pos
    )
    RETURNING id INTO v_header_id;

    -- 2b. Auto-Update PO Status
    IF p_purchase_order_id IS NOT NULL AND p_purchase_order_id > 0 THEN
        UPDATE purchase_order_headers SET status = 'Received' WHERE id = p_purchase_order_id;
    END IF;

    -- 3. Process Lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_order_lines)
    LOOP
        INSERT INTO purchase_invoice_lines (
            purchase_invoice_header_id, product_id, 
            ordered_qty, accepted_qty, 
            rate, discount_percent, discount_amount, scheme_amount, tax_amount, amount
        )
        VALUES (
            v_header_id, (v_line->>'product_id')::bigint,
            (v_line->>'ordered_qty')::numeric, (v_line->>'accepted_qty')::numeric,
            (v_line->>'rate')::numeric, (v_line->>'discount_percent')::numeric, 
            COALESCE((v_line->>'discount_amount')::numeric, 0),
            (v_line->>'scheme_amount')::numeric, 
            (v_line->>'tax_amount')::numeric, (v_line->>'amount')::numeric
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
        WHERE p.id = (v_line->>'product_id')::bigint
        RETURNING id INTO v_batch_id;

        -- Stock Traceability Log
        INSERT INTO stock_traceability (
            batch_id, product_id, quantity_change, transaction_type, 
            reference_id, reference_type, notes
        ) VALUES (
            v_batch_id, (v_line->>'product_id')::bigint, (v_line->>'accepted_qty')::numeric, 
            'IN', v_header_id, 'Purchase Invoice', 'GRN Inwarding'
        );
    END LOOP;

    -- 4. Create Accounting Journal Entry
    v_total_debit := p_total_taxable;
    v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_inventory, 'debit', p_total_taxable, 'credit', 0);

    -- Debit Tax Accounts
    IF v_gst_cgst_amt > 0 THEN
         v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_cgst, 'debit', v_gst_cgst_amt, 'credit', 0);
         v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_sgst, 'debit', v_gst_sgst_amt, 'credit', 0);
         v_total_debit := v_total_debit + v_gst_cgst_amt + v_gst_sgst_amt;
    ELSIF v_gst_igst_amt > 0 THEN
         v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_igst, 'debit', v_gst_igst_amt, 'credit', 0);
         v_total_debit := v_total_debit + v_gst_igst_amt;
    END IF;

    -- Credit Accounts Payable
    v_total_credit := p_grand_total;
    v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_payable, 'debit', 0, 'credit', p_grand_total);

    -- Rounding Adjustment
    v_diff := v_total_debit - v_total_credit;
    IF v_diff != 0 THEN
        IF v_diff > 0 THEN
            v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_rounding, 'debit', 0, 'credit', v_diff);
        ELSE
            v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_rounding, 'debit', ABS(v_diff), 'credit', 0);
        END IF;
    END IF;

    PERFORM create_journal_entry(
        p_invoice_date, 'GRN Inwarding: ' || v_internal_id, 'GRN', v_header_id, v_ledger_lines
    );

    -- 5a. AUTO-KNOCKOFF Debit Notes Phase
    FOR v_dn IN 
        SELECT 
            dn.id, 
            (dn.amount - COALESCE(dna.applied, 0)) as unallocated_credit
        FROM debit_notes dn
        LEFT JOIN (
            SELECT debit_note_id, SUM(amount) as applied 
            FROM debit_note_allocations GROUP BY debit_note_id
        ) dna ON dn.id = dna.debit_note_id
        WHERE dn.vendor_id = p_vendor_id 
          AND dn.status = 'Approved'
          AND (dn.amount - COALESCE(dna.applied, 0)) > 0.01
        ORDER BY dn.debit_note_date ASC, dn.id ASC
    LOOP
        IF v_grn_balance <= 0.01 THEN EXIT; END IF;

        v_apply := LEAST(v_dn.unallocated_credit, v_grn_balance);
        
        IF v_apply > 0 THEN
            INSERT INTO debit_note_allocations (debit_note_id, purchase_invoice_id, amount)
            VALUES (v_dn.id, v_header_id, v_apply);
            
            v_grn_balance := v_grn_balance - v_apply;
        END IF;
    END LOOP;

    -- [NEW] 5b. AUTO-KNOCKOFF Payments Phase (Advances)
    FOR v_pay IN 
        SELECT 
            vp.id, 
            (vp.amount - COALESCE(pa.applied, 0)) as unallocated_payment
        FROM vendor_payments vp
        LEFT JOIN (
            SELECT payment_id, SUM(amount) as applied 
            FROM payment_allocations GROUP BY payment_id
        ) pa ON vp.id = pa.payment_id
        WHERE vp.vendor_id = p_vendor_id 
          AND vp.is_active = true
          AND (vp.amount - COALESCE(pa.applied, 0)) > 0.01
        ORDER BY vp.payment_date ASC, vp.id ASC
    LOOP
        IF v_grn_balance <= 0.01 THEN EXIT; END IF;

        v_apply := LEAST(v_pay.unallocated_payment, v_grn_balance);
        
        IF v_apply > 0 THEN
            INSERT INTO payment_allocations (payment_id, purchase_invoice_id, amount)
            VALUES (v_pay.id, v_header_id, v_apply);
            
            v_grn_balance := v_grn_balance - v_apply;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'id', v_header_id, 'internal_id', v_internal_id);
END;
$function$;
