const { pool } = require('./config/db');

async function finalDeploy() {
    try {
        console.log("🕵️ Step 1: Purging all existing versions...");
        const funcsRes = await pool.query(`
            SELECT p.oid, pg_get_function_identity_arguments(p.oid) as args
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'create_purchase_invoice'
        `);
        console.log(`Found ${funcsRes.rows.length} version(s) to drop.`);
        for (const fn of funcsRes.rows) {
            await pool.query(`DROP FUNCTION IF EXISTS public.create_purchase_invoice(${fn.args})`);
            console.log(`✅ Dropped: (${fn.args})`);
        }

        console.log("\n🚀 Step 2: Deploying FINAL v15.3 with correct number sequencing...");

        const sql = `
CREATE FUNCTION public.create_purchase_invoice(
    p_vendor_id bigint,
    p_purchase_order_id bigint,
    p_invoice_number text,       -- This is the VENDOR's invoice number
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
    
    -- Sequence
    v_seq_prefix text;
    v_seq_num bigint;
    v_our_invoice_number text;   -- Our internal series (GRN/PI-XXXX)

    -- Accounting
    v_acc_payable int := 2001;
    v_acc_inventory int := 1001;
    v_acc_gst_igst int := 2013;
    v_acc_rounding int := 5003;
    v_total_debit numeric := 0;
    v_total_credit numeric := 0;
    v_diff numeric;
    v_ledger_lines jsonb := '[]'::jsonb;

    -- Line vars
    v_net_purchase_rate numeric(15,4);
    v_line_gross numeric;
    v_line_tax numeric;
    v_line_taxable numeric;
    v_line_qty numeric;
BEGIN
    -- ============================================================
    -- STEP 1: GENERATE OUR INTERNAL INVOICE NUMBER (from sequences)
    -- ============================================================
    SELECT prefix, current_number
    INTO v_seq_prefix, v_seq_num
    FROM document_sequences
    WHERE document_type = 'GRN' AND is_active = true
    FOR UPDATE;

    IF v_seq_prefix IS NULL THEN
        -- Fallback if no sequence configured
        v_our_invoice_number := 'GRN-' || to_char(NOW(), 'YYYY') || '-' || LPAD(FLOOR(random() * 9999 + 1)::text, 4, '0');
    ELSE
        v_seq_num := v_seq_num + 1;
        v_our_invoice_number := v_seq_prefix || v_seq_num;

        UPDATE document_sequences
        SET current_number = v_seq_num
        WHERE document_type = 'GRN' AND is_active = true;
    END IF;

    -- ============================================================
    -- STEP 2: INSERT HEADER
    -- invoice_number = Our serial (GRN-001), vendor_invoice_number = Vendor's bill no.
    -- ============================================================
    INSERT INTO purchase_invoice_headers (
        vendor_id,
        purchase_order_id,
        invoice_number,           -- OUR internal series
        vendor_invoice_number,    -- Vendor's own bill number
        vendor_invoice_date,
        received_date,
        grand_total,
        taxable_amount,
        tax_amount,
        status,
        parent_invoice_id
    ) VALUES (
        p_vendor_id,
        p_purchase_order_id,
        v_our_invoice_number,    -- OUR series number
        p_invoice_number,        -- Vendor's number (from request body)
        p_invoice_date,
        p_received_date,
        p_grand_total,
        p_total_taxable,
        p_tax_amount,
        'Approved',
        p_parent_invoice_id
    ) RETURNING id INTO v_header_id;

    -- ============================================================
    -- STEP 3: PROCESS LINES
    -- ============================================================
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_order_lines)
    LOOP
        v_line_qty     := COALESCE((v_line->>'accepted_qty')::numeric, 0);
        v_line_gross   := COALESCE((v_line->>'amount')::numeric, 0);
        v_line_tax     := COALESCE((v_line->>'tax_amount')::numeric, 0);
        v_line_taxable := v_line_gross - v_line_tax;

        -- v15.3: Realized Unit Cost = Taxable / Qty
        IF v_line_qty > 0 THEN
            v_net_purchase_rate := v_line_taxable / v_line_qty;
        ELSE
            v_net_purchase_rate := COALESCE((v_line->>'rate')::numeric, 0);
        END IF;

        -- Insert Line (NO status column in purchase_invoice_lines)
        INSERT INTO purchase_invoice_lines (
            purchase_invoice_header_id,
            product_id,
            ordered_qty,
            accepted_qty,
            rate,
            amount,
            tax_amount,
            discount_percent,
            scheme_amount,
            discount_amount
        ) VALUES (
            v_header_id,
            (v_line->>'product_id')::bigint,
            COALESCE((v_line->>'ordered_qty')::numeric, 0),
            v_line_qty,
            COALESCE((v_line->>'rate')::numeric, 0),
            v_line_gross,
            v_line_tax,
            COALESCE((v_line->>'discount_percent')::numeric, 0),
            COALESCE((v_line->>'scheme_amount')::numeric, 0),
            COALESCE((v_line->>'discount_amount')::numeric, 0)
        ) RETURNING id INTO v_line_id;

        -- Create Inventory Batch (HAS status column)
        INSERT INTO inventory_batches (
            product_id,
            grn_id,
            batch_code,
            purchase_rate,
            net_purchase_rate,
            mrp,
            distributor_rate,
            wholesale_rate,
            dealer_rate,
            retail_rate,
            quantity_initial,
            quantity_remaining,
            expiry_date,
            is_active,
            status,
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

        -- Stock Traceability
        INSERT INTO stock_traceability (
            batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type
        ) VALUES (
            v_batch_id,
            (v_line->>'product_id')::bigint,
            v_line_qty,
            'IN',
            v_header_id,
            'Purchase Invoice'
        );

        v_total_debit := v_total_debit + v_line_taxable;
        v_ledger_lines := v_ledger_lines || jsonb_build_object(
            'code', v_acc_inventory, 'debit', v_line_taxable, 'credit', 0
        );
    END LOOP;

    -- ============================================================
    -- STEP 4: ACCOUNTING
    -- ============================================================
    IF p_tax_amount > 0 THEN
        v_ledger_lines := v_ledger_lines || jsonb_build_object(
            'code', v_acc_gst_igst, 'debit', p_tax_amount, 'credit', 0
        );
        v_total_debit := v_total_debit + p_tax_amount;
    END IF;

    v_total_credit := p_grand_total;
    v_ledger_lines := v_ledger_lines || jsonb_build_object(
        'code', v_acc_payable, 'debit', 0, 'credit', p_grand_total
    );

    v_diff := v_total_debit - v_total_credit;
    IF v_diff != 0 THEN
        IF v_diff > 0 THEN
            v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_rounding, 'debit', 0, 'credit', v_diff);
        ELSE
            v_ledger_lines := v_ledger_lines || jsonb_build_object('code', v_acc_rounding, 'debit', ABS(v_diff), 'credit', 0);
        END IF;
    END IF;

    PERFORM create_journal_entry(
        p_received_date,
        'GRN Inwarding: ' || v_our_invoice_number,
        'GRN',
        v_header_id,
        v_ledger_lines
    );

    RETURN jsonb_build_object(
        'success', true,
        'id', v_header_id,
        'invoice_number', v_our_invoice_number,
        'vendor_invoice_number', p_invoice_number
    );
END;
$function$;
        `;

        await pool.query(sql);
        console.log("✅ FINAL v15.3 deployed! Sequence numbering restored.");

        const verify = await pool.query(`
            SELECT COUNT(*) as count FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'create_purchase_invoice'
        `);
        console.log(`✅ Verified: ${verify.rows[0].count} function(s) in DB (should be 1).`);

    } catch (err) {
        console.error("❌ Deploy Error:", err.message);
    } finally {
        process.exit();
    }
}

finalDeploy();
