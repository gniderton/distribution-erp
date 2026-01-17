const { pool } = require('../config/db');

async function fixRpcSequence() {
    try {
        console.log("Updating create_purchase_invoice to include Auto-ID generation...");

        await pool.query(`
            CREATE OR REPLACE FUNCTION create_purchase_invoice(
                p_vendor_id bigint,
                p_po_id bigint,
                p_invoice_number text, -- THIS IS VENDOR BILL NO
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
                v_seq_num bigint;
            BEGIN
                
                -- 1. Auto-Generate Internal ID (Sequence Logic)
                UPDATE document_sequences 
                SET current_number = current_number + 1
                WHERE document_type = 'PI'
                RETURNING current_number INTO v_seq_num;
                
                -- Fallback if sequence doesn't exist (SafetyNet)
                IF v_seq_num IS NULL THEN
                   INSERT INTO document_sequences (company_settings_id, branch_id, document_type, prefix, current_number)
                   VALUES (1, 1, 'PI', 'PI', 1)
                   RETURNING current_number INTO v_seq_num;
                END IF;
                
                v_internal_id := 'PI-' || v_seq_num;

                -- 2. Insert Header
                INSERT INTO purchase_invoice_headers (
                    vendor_id, purchase_order_id, 
                    invoice_number, -- Internal System ID
                    vendor_invoice_number, -- Their Bill No
                    vendor_invoice_date, received_date,
                    total_net, tax_amount, grand_total, status,
                    parent_invoice_id,
                    created_by
                )
                VALUES (
                    p_vendor_id, 
                    (CASE WHEN p_po_id = 0 THEN NULL ELSE p_po_id END), 
                    v_internal_id, -- Auto-Generated
                    p_invoice_number, -- User Input (Vendor Bill No)
                    p_invoice_date, 
                    p_received_date,
                    p_total_net, p_tax_amount, p_grand_total, 'Verified',
                    p_parent_id,
                    1
                )
                RETURNING id INTO v_header_id;

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

                    -- Create Batch (qty_good logic)
                    INSERT INTO product_batches (
                        product_id, purchase_invoice_line_id, batch_number,
                        mrp, expiry_date, received_date,
                        purchase_rate, qty_good, initial_qty, is_active
                    )
                    VALUES (
                        (v_line->>'product_id')::bigint, v_line_id, (v_line->>'batch_number'),
                        (v_line->>'mrp')::numeric, (v_line->>'expiry_date')::date, p_received_date,
                        (v_line->>'rate')::numeric, (v_line->>'accepted_qty')::numeric, (v_line->>'accepted_qty')::numeric, true
                    );
                END LOOP;

                RETURN jsonb_build_object('success', true, 'id', v_header_id, 'internal_id', v_internal_id);
            END;
            $function$;
        `);
        console.log("RPC Updated Successfully with Auto-ID Logic.");

    } catch (err) {
        console.error("RPC Fix Error:", err.message);
    } finally {
        pool.end();
    }
}
fixRpcSequence();
