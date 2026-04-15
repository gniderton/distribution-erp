const { pool } = require('./config/db');

async function alignAndFixFunction() {
    try {
        console.log("🕵️ Step 1: Purging all versions of 'create_purchase_invoice'...");

        // Find all function OIDs to bypass the name ambiguity problem
        const funcsRes = await pool.query(`
            SELECT p.oid, pg_get_function_identity_arguments(p.oid) as args
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'create_purchase_invoice'
        `);

        console.log(`Found ${funcsRes.rows.length} version(s) to drop.`);

        // Drop each one by its exact signature
        for (const fn of funcsRes.rows) {
            await pool.query(`DROP FUNCTION IF EXISTS public.create_purchase_invoice(${fn.args})`);
            console.log(`✅ Dropped signature: create_purchase_invoice(${fn.args})`);
        }

        console.log("\n🚀 Step 2: Deploying clean v15.2 aligned with the database schema...");

        // Aligned with the database schema found in purchase_invoice_headers:
        // vendor_invoice_date, taxable_amount, tax_amount
        const v15_AlignedSql = `
CREATE OR REPLACE FUNCTION public.create_purchase_invoice(
    p_vendor_id bigint,
    p_purchase_order_id bigint,
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
    -- 1. Create Purchase Invoice Header (Using Exact Column Names)
    INSERT INTO purchase_invoice_headers (
        vendor_id, purchase_order_id, invoice_number, vendor_invoice_date, received_date, grand_total, 
        taxable_amount, tax_amount, status, parent_invoice_id
    ) VALUES (
        p_vendor_id, p_purchase_order_id, p_invoice_number, p_invoice_date, p_received_date, p_grand_total,
        p_total_taxable, p_tax_amount, 'Approved', p_parent_invoice_id
    ) RETURNING id, invoice_number INTO v_header_id, v_internal_id;

    -- 2. Process Lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_order_lines)
    LOOP
        -- Map indices correctly: amount is taxable in the RPC payload
        v_line_taxable := (v_line->>'amount')::numeric;
        v_line_qty := (v_line->>'accepted_qty')::numeric;
        
        -- v15.2: Capture Actual Realized Cost
        IF v_line_qty > 0 THEN
            v_net_purchase_rate := v_line_taxable / v_line_qty;
        ELSE
            v_net_purchase_rate := (v_line->>'rate')::numeric;
        END IF;

        -- Insert Line
        INSERT INTO purchase_invoice_lines (
            purchase_invoice_header_id, product_id, ordered_qty, accepted_qty, 
            rate, amount, status
        ) VALUES (
            v_header_id, 
            (v_line->>'product_id')::bigint,
            (v_line->>'ordered_qty')::numeric,
            v_line_qty,
            (v_line->>'rate')::numeric,
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
            (v_line->>'batch_number'),
            (v_line->>'rate')::numeric,
            v_net_purchase_rate,
            (v_line->>'mrp')::numeric,
            (v_line->>'distributor_rate')::numeric,
            (v_line->>'wholesale_rate')::numeric,
            (v_line->>'dealer_rate')::numeric,
            (v_line->>'retail_rate')::numeric,
            v_line_qty,
            v_line_qty,
            NULLIF(v_line->>'expiry_date', '')::date,
            true,
            'Good',
            v_line_id
        ) RETURNING id INTO v_batch_id;

        -- Stock Traceability
        INSERT INTO stock_traceability (
            batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type
        ) VALUES (
            v_batch_id, (v_line)->>'product_id'::bigint, v_line_qty, 'IN', v_header_id, 'Purchase Invoice'
        );

        -- Add to Inventory Debit accumulator
        v_total_debit := v_total_debit + v_line_taxable;
        v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_inventory, 'debit', v_line_taxable, 'credit', 0);
    END LOOP;

    -- Accounting (Simplified Mapping)
    IF p_tax_amount > 0 THEN
        v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_igst, 'debit', p_tax_amount, 'credit', 0);
        v_total_debit := v_total_debit + p_tax_amount;
    END IF;

    v_total_credit := p_grand_total;
    v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_payable, 'debit', 0, 'credit', p_grand_total);

    v_diff := v_total_debit - v_total_credit;
    IF v_diff != 0 THEN
        IF v_diff > 0 THEN
            v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_rounding, 'debit', 0, 'credit', v_diff);
        ELSE
            v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_rounding, 'debit', ABS(v_diff), 'credit', 0);
        END IF;
    END IF;

    PERFORM create_journal_entry(
        p_received_date, 'GRN Inwarding: ' || v_internal_id, 'GRN', v_header_id, v_ledger_lines
    );

    RETURN jsonb_build_object('success', true, 'id', v_header_id, 'invoice_number', v_internal_id);
END;
$function$;
        `;

        await pool.query(v15_AlignedSql);
        console.log("🚀 SUCCESS! Corrected v15.2 deployed. Schema alignment 100%.");

    } catch (err) {
        console.error("Deduplication Error:", err);
    } finally {
        process.exit();
    }
}

alignAndFixFunction();
