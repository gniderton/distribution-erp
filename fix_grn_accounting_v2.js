const { pool } = require('./config/db');

async function fixGrnAccounting() {
    try {
        console.log("🕵️ Purging old versions of 'create_purchase_invoice'...");

        const funcsRes = await pool.query(`
            SELECT p.oid, pg_get_function_identity_arguments(p.oid) as args
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'create_purchase_invoice'
        `);

        for (const fn of funcsRes.rows) {
            await pool.query(`DROP FUNCTION IF EXISTS public.create_purchase_invoice(${fn.args})`);
            console.log(`✅ Dropped: create_purchase_invoice(${fn.args})`);
        }

        console.log("\n🚀 Deploying Hardened GRN Accounting (v16.0)...");

        const sql = `
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
 SECURITY DEFINER
AS $function$
DECLARE
    v_header_id bigint;
    v_line jsonb;
    v_line_id bigint;
    v_batch_id bigint;
    
    -- Account Codes (Asset/Liability)
    v_acc_payable   int := 2001;
    v_acc_inventory int := 1001;
    v_acc_gst_igst  int := 1010;
    v_acc_gst_cgst  int := 1011;
    v_acc_gst_sgst  int := 1012;
    v_acc_rounding  int := 5003;
    
    v_total_debit   numeric := 0;
    v_total_credit  numeric := 0;
    v_diff          numeric;
    v_ledger_lines  jsonb := '[]'::jsonb;
    v_internal_id   text;
    
    -- Tax Splitting
    v_vendor_gst        text;
    v_company_state     int;
    v_vendor_state      int;
    v_is_intra_state    boolean := false;
    v_cgst_amt          numeric := 0;
    v_sgst_amt          numeric := 0;
    v_igst_amt          numeric := 0;

    -- Line Variables
    v_line_taxable      numeric;
    v_line_tax          numeric;
    v_line_qty          numeric;
    v_net_purchase_rate numeric(15,4);
BEGIN
    -- 0. Determine Tax Split (Intra vs Inter State)
    SELECT gst INTO v_vendor_gst FROM vendors WHERE id = p_vendor_id;
    SELECT state_code INTO v_company_state FROM company_settings LIMIT 1;
    IF v_company_state IS NULL THEN v_company_state := 32; END IF;

    IF v_vendor_gst IS NOT NULL AND LENGTH(v_vendor_gst) >= 2 THEN
        v_vendor_state := SUBSTRING(v_vendor_gst, 1, 2)::int;
        IF v_vendor_state = v_company_state THEN
            v_is_intra_state := true;
        END IF;
    ELSE
        v_is_intra_state := true; -- Default to Local if GST missing
    END IF;

    IF p_tax_amount > 0 THEN
        IF v_is_intra_state THEN
            v_cgst_amt := p_tax_amount / 2;
            v_sgst_amt := p_tax_amount / 2;
        ELSE
            v_igst_amt := p_tax_amount;
        END IF;
    END IF;

    -- 1. Create Purchase Invoice Header
    INSERT INTO purchase_invoice_headers (
        vendor_id, purchase_order_id, invoice_number, vendor_invoice_date, received_date, 
        taxable_amount, tax_amount, grand_total, status, parent_invoice_id,
        cgst_amount, sgst_amount, igst_amount
    ) VALUES (
        p_vendor_id, p_purchase_order_id, p_invoice_number, p_invoice_date, p_received_date,
        p_total_taxable, p_tax_amount, p_grand_total, 'Approved', p_parent_invoice_id,
        v_cgst_amt, v_sgst_amt, v_igst_amt
    ) RETURNING id, invoice_number INTO v_header_id, v_internal_id;

    -- 2. Process Lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_order_lines)
    LOOP
        -- CRITICAL: Extract Tax-Exclusive value for Inventory
        v_line_tax     := COALESCE((v_line->>'tax_amount')::numeric, 0);
        v_line_taxable := (v_line->>'amount')::numeric - v_line_tax;
        v_line_qty     := (v_line->>'accepted_qty')::numeric;
        
        -- Capture Actual Realized Cost per unit (Net)
        IF v_line_qty > 0 THEN
            v_net_purchase_rate := v_line_taxable / v_line_qty;
        ELSE
            v_net_purchase_rate := (v_line->>'rate')::numeric;
        END IF;

        -- Insert Line
        INSERT INTO purchase_invoice_lines (
            purchase_invoice_header_id, product_id, ordered_qty, accepted_qty, 
            rate, tax_amount, amount, status
        ) VALUES (
            v_header_id, (v_line->>'product_id')::bigint,
            (v_line->>'ordered_qty')::numeric, v_line_qty,
            (v_line->>'rate')::numeric, v_line_tax, (v_line->>'amount')::numeric,
            'Good'
        ) RETURNING id INTO v_line_id;

        -- Create Inventory Batch
        INSERT INTO inventory_batches (
            product_id, grn_id, batch_code, purchase_rate, net_purchase_rate, mrp,
            distributor_rate, wholesale_rate, dealer_rate, retail_rate,
            quantity_initial, quantity_remaining, expiry_date, is_active, status,
            purchase_invoice_line_id
        ) VALUES (
            (v_line->>'product_id')::bigint, v_header_id, (v_line->>'batch_number'),
            (v_line->>'rate')::numeric, v_net_purchase_rate, (v_line->>'mrp')::numeric,
            (v_line->>'distributor_rate')::numeric, (v_line->>'wholesale_rate')::numeric,
            (v_line->>'dealer_rate')::numeric, (v_line->>'retail_rate')::numeric,
            v_line_qty, v_line_qty, NULLIF(v_line->>'expiry_date', '')::date,
            true, 'Good', v_line_id
        );

        -- Accumulate Total Inventory Debit (One line required)
        v_total_debit  := v_total_debit + v_line_taxable;
    END LOOP;

    -- 2.5 Accounting: Add Single Inventory Line
    v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_inventory, 'debit', v_total_debit, 'credit', 0);

    -- 3. Accounting: Add Tax Lines
    IF v_cgst_amt > 0 THEN
        v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_cgst, 'debit', v_cgst_amt, 'credit', 0);
        v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_sgst, 'debit', v_sgst_amt, 'credit', 0);
        v_total_debit  := v_total_debit + v_cgst_amt + v_sgst_amt;
    ELSIF v_igst_amt > 0 THEN
        v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_gst_igst, 'debit', v_igst_amt, 'credit', 0);
        v_total_debit  := v_total_debit + v_igst_amt;
    END IF;

    -- 4. Accounting: Add Payable Line
    v_total_credit := p_grand_total;
    v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_payable, 'debit', 0, 'credit', p_grand_total);

    -- 5. Final Rounding Balancing
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

    RETURN jsonb_build_object('success', true, 'id', v_header_id);
END;
$function$;
        `;

        await pool.query(sql);
        console.log("🚀 SUCCESS! GRN Accounting Logic Fixed & Hardened.");

    } catch (err) {
        console.error("❌ Fix Failed:", err);
    } finally {
        process.exit();
    }
}

fixGrnAccounting();
