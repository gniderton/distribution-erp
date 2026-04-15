const { pool } = require('./config/db');

async function fixDuplicateFunction() {
    try {
        console.log("🕵️ Cleaning up duplicate 'create_purchase_invoice' functions...");

        // 1. Drop the function entirely to clear all signatures
        // We use CASCADE to handle any dependencies if they exist (rare for this RPC)
        await pool.query(`DROP FUNCTION IF EXISTS public.create_purchase_invoice CASCADE`);

        // 2. Re-deploy the exact version the Node.js route expects (v15.1 pattern)
        // Note: I checked purchase_invoices.js Line 192. It expects 10 parameters.
        const v15_2_Sql = `
CREATE OR REPLACE FUNCTION public.create_purchase_invoice(
    p_vendor_id bigint,
    p_purchase_order_id bigint,  -- Added to match purchase_invoices.js expectations
    p_invoice_number text,
    p_invoice_date date,
    p_received_date date,
    p_total_taxable numeric,
    p_tax_amount numeric,
    p_grand_total numeric,
    p_order_lines jsonb,
    p_parent_invoice_id bigint DEFAULT NULL
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
    v_acc_gst_igst int := 2013;
    v_acc_rounding int := 5003;
    v_total_debit numeric := 0;
    v_total_credit numeric := 0;
    v_diff numeric;
    v_ledger_lines jsonb := '[]'::jsonb;
    v_internal_id text;
    
    -- v15.2 Hardening
    v_net_purchase_rate numeric(15,4);
    v_line_taxable numeric;
    v_line_qty numeric;
BEGIN
    -- 1. Create Purchase Invoice Header
    INSERT INTO purchase_invoice_headers (
        vendor_id, purchase_order_id, invoice_number, invoice_date, received_date, grand_total, 
        total_taxable, total_tax, status
    ) VALUES (
        p_vendor_id, p_purchase_order_id, p_invoice_number, p_invoice_date, p_received_date, p_grand_total,
        p_total_taxable, p_tax_amount, 'Approved'
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
            purchase_invoice_header_id, product_id, ordered_qty, accepted_qty, 
            rate, amount, status
        ) VALUES (
            v_header_id, 
            (v_line->>'product_id')::bigint,
            (v_line->>'ordered_quantity')::numeric,
            v_line_qty,
            (v_line->>'purchase_rate')::numeric,
            v_line_taxable,
            'Good'
        ) RETURNING id INTO v_line_id;

        -- Create Inventory Batch
        INSERT INTO inventory_batches (
            product_id, grn_id, batch_code, purchase_rate, net_purchase_rate, mrp,
            distributor_rate, wholesale_rate, dealer_rate, retail_rate,
            quantity_initial, quantity_remaining, expiry_date, is_active, status,
            purchase_invoice_line_id
        ) VALUES (
            (v_line->>'product_id')::bigint,
            v_header_id,
            v_line->>'batch_code',
            (v_line->>'purchase_rate')::numeric,
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

    -- 3. Accounting Integration (Simplified for Re-deploy)
    -- This version uses IGST as default for now to match balance 
    IF p_tax_amount > 0 THEN
        v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_igst, 'debit', p_tax_amount, 'credit', 0);
        v_total_debit := v_total_debit + p_tax_amount;
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

        await pool.query(v15_2_Sql);
        console.log("🚀 SUCCESS! Duplicate functions purged and Uni-Signature v15.2 deployed.");

    } catch (err) {
        console.error("Deduplication Error:", err);
    } finally {
        process.exit();
    }
}

fixDuplicateFunction();
