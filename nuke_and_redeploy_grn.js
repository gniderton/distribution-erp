const { pool } = require('./config/db');

async function nukeAndRedeploy() {
    try {
        console.log("🕵️ Step 1: Finding all versions of 'create_purchase_invoice'...");

        const funcsRes = await pool.query(`
            SELECT p.oid, pg_get_function_identity_arguments(p.oid) as args
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'create_purchase_invoice'
        `);

        console.log(`Found ${funcsRes.rows.length} version(s):`);
        console.table(funcsRes.rows);

        // Drop each one by its exact signature
        for (const fn of funcsRes.rows) {
            await pool.query(`DROP FUNCTION public.create_purchase_invoice(${fn.args})`);
            console.log(`✅ Dropped: create_purchase_invoice(${fn.args})`);
        }

        console.log("\n🚀 Step 2: Deploying clean v15.2 with CORRECT field mappings...");

        // CORRECT field names matching purchase_invoices.js:
        // accepted_qty, rate, amount (gross), batch_number
        // taxable = amount - tax_amount (per line)
        const v15_sql = `
CREATE FUNCTION public.create_purchase_invoice(
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
    v_net_purchase_rate numeric(15,4);
    v_line_gross numeric;
    v_line_tax numeric;
    v_line_taxable numeric;
    v_line_qty numeric;
BEGIN
    INSERT INTO purchase_invoice_headers (
        vendor_id, purchase_order_id, invoice_number, invoice_date, received_date,
        grand_total, total_taxable, total_tax, status
    ) VALUES (
        p_vendor_id, p_purchase_order_id, p_invoice_number, p_invoice_date, p_received_date,
        p_grand_total, p_total_taxable, p_tax_amount, 'Approved'
    ) RETURNING id, invoice_number INTO v_header_id, v_internal_id;

    FOR v_line IN SELECT * FROM jsonb_array_elements(p_order_lines)
    LOOP
        -- CORRECT field names from Node.js enrichedLines
        v_line_qty    := COALESCE((v_line->>'accepted_qty')::numeric, 0);
        v_line_gross  := COALESCE((v_line->>'amount')::numeric, 0);       -- gross (taxable + tax)
        v_line_tax    := COALESCE((v_line->>'tax_amount')::numeric, 0);
        v_line_taxable := v_line_gross - v_line_tax;                      -- extract taxable portion

        -- v15.2 Core: Net Realized Unit Cost
        IF v_line_qty > 0 THEN
            v_net_purchase_rate := v_line_taxable / v_line_qty;
        ELSE
            v_net_purchase_rate := COALESCE((v_line->>'rate')::numeric, 0);
        END IF;

        INSERT INTO purchase_invoice_lines (
            purchase_invoice_header_id, product_id, ordered_qty, accepted_qty,
            rate, amount, status
        ) VALUES (
            v_header_id,
            (v_line->>'product_id')::bigint,
            COALESCE((v_line->>'ordered_qty')::numeric, 0),
            v_line_qty,
            COALESCE((v_line->>'rate')::numeric, 0),
            v_line_gross,
            'Good'
        ) RETURNING id INTO v_line_id;

        INSERT INTO inventory_batches (
            product_id, grn_id, batch_code, purchase_rate, net_purchase_rate, mrp,
            distributor_rate, wholesale_rate, dealer_rate, retail_rate,
            quantity_initial, quantity_remaining, expiry_date, is_active, status,
            purchase_invoice_line_id
        ) VALUES (
            (v_line->>'product_id')::bigint,
            v_header_id,
            COALESCE(v_line->>'batch_number', 'DEFAULT'),
            COALESCE((v_line->>'rate')::numeric, 0),
            v_net_purchase_rate,
            COALESCE((v_line->>'mrp')::numeric, 0),
            COALESCE((v_line->>'distributor_rate')::numeric, 0),
            COALESCE((v_line->>'wholesale_rate')::numeric, 0),
            COALESCE((v_line->>'dealer_rate')::numeric, 0),
            COALESCE((v_line->>'retail_rate')::numeric, 0),
            v_line_qty,
            v_line_qty,
            NULLIF(v_line->>'expiry_date', '')::date,
            true,
            'Good',
            v_line_id
        ) RETURNING id INTO v_batch_id;

        INSERT INTO stock_traceability (
            batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type
        ) VALUES (
            v_batch_id, (v_line->>'product_id')::bigint, v_line_qty, 'IN', v_header_id, 'Purchase Invoice'
        );

        v_total_debit := v_total_debit + v_line_taxable;
        v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_inventory, 'debit', v_line_taxable, 'credit', 0);
    END LOOP;

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
        p_invoice_date, 'GRN Inwarding: ' || v_internal_id, 'GRN', v_header_id, v_ledger_lines
    );

    RETURN jsonb_build_object('success', true, 'id', v_header_id, 'invoice_number', v_internal_id);
END;
$function$;
        `;

        await pool.query(v15_sql);
        console.log("🚀 SUCCESS! Clean v15.2 deployed with correct field mappings.");

        const verify = await pool.query(`
            SELECT COUNT(*) as count FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'create_purchase_invoice'
        `);
        console.log(`✅ Verification: ${verify.rows[0].count} function(s) now exist (should be 1).`);

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        process.exit();
    }
}

nukeAndRedeploy();
