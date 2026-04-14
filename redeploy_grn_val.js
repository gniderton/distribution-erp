const { pool } = require('./config/db');

async function redeployGrnValuation() {
    try {
        console.log("🕵️ Re-deploying Hardened GRN Function (v15.2)...");

        const upgradeSql = `
CREATE OR REPLACE FUNCTION public.create_purchase_invoice(
    p_vendor_id bigint,
    p_invoice_number text,
    p_invoice_date date,
    p_grand_total numeric,
    p_total_taxable numeric,
    p_total_tax numeric,
    p_total_cgst numeric,
    p_total_sgst numeric,
    p_total_igst numeric,
    p_order_lines jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_header_id bigint;
    v_line jsonb;
    v_line_id bigint;
    v_batch_id bigint;
    v_acc_payable int := 2001;
    v_acc_inventory int := 1001;
    v_acc_gst_cgst int := 2011;
    v_acc_gst_sgst int := 2012;
    v_acc_gst_igst int := 2013;
    v_acc_rounding int := 5003;
    v_total_debit numeric := 0;
    v_total_credit numeric := 0;
    v_diff numeric;
    v_ledger_lines jsonb := '[]'::jsonb;
    v_internal_id text;
    
    -- v15.2 Hardening
    v_p_rate numeric;
    v_net_purchase_rate numeric(15,4);
    v_line_taxable numeric;
    v_line_qty numeric;
BEGIN
    -- 1. Create Purchase Invoice Header
    INSERT INTO purchase_invoice_headers (
        vendor_id, invoice_number, invoice_date, grand_total, 
        total_taxable, total_tax, total_cgst, total_sgst, total_igst, status
    ) VALUES (
        p_vendor_id, p_invoice_number, p_invoice_date, p_grand_total,
        p_total_taxable, p_total_tax, p_total_cgst, p_total_sgst, p_total_igst, 'Approved'
    ) RETURNING id, invoice_number INTO v_header_id, v_internal_id;

    -- 2. Process Lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_order_lines)
    LOOP
        v_line_taxable := (v_line->>'taxable_amount')::numeric;
        v_line_qty := (v_line->>'accepted_quantity')::numeric;
        
        -- v15.2: Capture Actual Realized Cost
        IF v_line_qty > 0 THEN
            v_net_purchase_rate := v_line_taxable / v_line_qty;
        ELSE
            v_net_purchase_rate := (v_line->>'purchase_rate')::numeric;
        END IF;

        -- Insert Line
        INSERT INTO purchase_invoice_lines (
            header_id, product_id, ordered_quantity, accepted_quantity, 
            purchase_rate, taxable_amount, tax_percent, tax_amount, total_amount
        ) VALUES (
            v_header_id, 
            (v_line->>'product_id')::bigint,
            (v_line->>'ordered_quantity')::numeric,
            v_line_qty,
            (v_line->>'purchase_rate')::numeric,
            v_line_taxable,
            (v_line->>'tax_percent')::numeric,
            (v_line->>'tax_amount')::numeric,
            (v_line->>'total_amount')::numeric
        ) RETURNING id INTO v_line_id;

        -- Create/Update Inventory Batch
        -- Using purchase_rate as v_p_rate for compatibility, but adding net_purchase_rate
        v_p_rate := (v_line->>'purchase_rate')::numeric;

        INSERT INTO inventory_batches (
            product_id, grn_id, batch_code, purchase_rate, net_purchase_rate, mrp,
            distributor_rate, wholesale_rate, dealer_rate, retail_rate,
            quantity_initial, quantity_remaining, expiry_date, is_active, status,
            purchase_invoice_line_id
        ) VALUES (
            (v_line->>'product_id')::bigint,
            v_header_id,
            v_line->>'batch_code',
            v_p_rate,
            v_net_purchase_rate,
            (v_line->>'mrp')::numeric,
            (v_line->>'distributor_rate')::numeric,
            (v_line->>'wholesale_rate')::numeric,
            (v_line->>'dealer_rate')::numeric,
            (v_line->>'retail_rate')::numeric,
            v_line_qty,
            v_line_qty,
            (v_line->>'expiry_date')::date,
            true,
            'Good',
            v_line_id
        ) RETURNING id INTO v_batch_id;

        -- Stock Traceability
        INSERT INTO stock_traceability (
            batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type
        ) VALUES (
            v_batch_id, (v_line->>'product_id')::bigint, v_line_qty, 'IN', v_header_id, 'Purchase Invoice'
        );

        -- Add to Inventory Debit accumulator
        v_total_debit := v_total_debit + v_line_taxable;
        v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_inventory, 'debit', v_line_taxable, 'credit', 0);
    END LOOP;

    -- 3. Accounting Integration
    -- Tax Lines
    IF p_total_cgst > 0 THEN
        v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_cgst, 'debit', p_total_cgst, 'credit', 0);
        v_total_debit := v_total_debit + p_total_cgst;
    END IF;
    IF p_total_sgst > 0 THEN
        v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_sgst, 'debit', p_total_sgst, 'credit', 0);
        v_total_debit := v_total_debit + p_total_sgst;
    END IF;
    IF p_total_igst > 0 THEN
        v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_igst, 'debit', p_total_igst, 'credit', 0);
        v_total_debit := v_total_debit + p_total_igst;
    END IF;

    -- Accounts Payable Credit
    v_total_credit := p_grand_total;
    v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_payable, 'debit', 0, 'credit', p_grand_total);

    -- Simple Rounding
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

    RETURN jsonb_build_object('success', true, 'id', v_header_id, 'invoice_number', v_internal_id);
END;
$function$;
        `;

        await pool.query(upgradeSql);
        console.log("🚀 SUCCESS! Hardened GRN Function (v15.2) deployed.");

    } catch (err) {
        console.error("Redeploy Error:", err);
    } finally {
        process.exit();
    }
}

redeployGrnValuation();
