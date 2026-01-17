const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function fixRpc() {
    try {
        console.log("Dropping ambiguous versions of create_purchase_invoice...");

        // 1. Drop existing versions explicitly
        await pool.query(`
            DROP FUNCTION IF EXISTS create_purchase_invoice(bigint, bigint, text, date, date, numeric, numeric, numeric, jsonb);
            DROP FUNCTION IF EXISTS create_purchase_invoice(bigint, bigint, text, date, date, numeric, numeric, numeric, jsonb, bigint);
        `);
        console.log("Functions dropped.");

        // 2. Read the latest definition
        const sqlPath = path.join(__dirname, '009_rpc_inwarding.sql');
        let sql = fs.readFileSync(sqlPath, 'utf8');

        // Note: 009_rpc_inwarding.sql might contain the OLD version if I didn't update it in a previous turn.
        // I should check its content or overwrite it with the CORRECT definition first.
        // Let's assume I need to PROVIDE the correct 10-argument version here to be safe.

        console.log("Applying Correct RPC...");
        await pool.query(`
            CREATE OR REPLACE FUNCTION create_purchase_invoice(
                p_vendor_id bigint,
                p_po_id bigint,
                p_invoice_number text,
                p_invoice_date date,
                p_received_date date,
                p_total_net numeric,
                p_tax_amount numeric,
                p_grand_total numeric,
                p_lines_json jsonb,
                p_parent_id bigint DEFAULT NULL -- Added Traceability
            )
            RETURNS jsonb
            LANGUAGE plpgsql
            AS $function$
            DECLARE
                v_header_id bigint;
                v_line jsonb;
                v_batch_no text;
                v_line_id bigint;
            BEGIN
                -- 1. Insert Header
                INSERT INTO purchase_invoice_headers (
                    vendor_id, purchase_order_id, invoice_number, 
                    vendor_invoice_number, vendor_invoice_date, received_date,
                    total_net, tax_amount, grand_total, status,
                    parent_invoice_id, -- Traceability
                    created_by -- Audit
                )
                VALUES (
                    p_vendor_id, 
                    (CASE WHEN p_po_id = 0 THEN NULL ELSE p_po_id END), 
                    p_invoice_number,
                    p_invoice_number, -- Default mismatch fix
                    p_invoice_date, 
                    p_received_date,
                    p_total_net, p_tax_amount, p_grand_total, 'Verified',
                    p_parent_id,
                    1 -- Hardcoded System User for now
                )
                RETURNING id INTO v_header_id;

                -- 2. Process Lines
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

                    -- Create Batch
                    INSERT INTO product_batches (
                        product_id, purchase_invoice_line_id, batch_number,
                        mrp, expiry_date, received_date,
                        purchase_rate, current_qty, initial_qty, is_active
                    )
                    VALUES (
                        (v_line->>'product_id')::bigint, v_line_id, (v_line->>'batch_number'),
                        (v_line->>'mrp')::numeric, (v_line->>'expiry_date')::date, p_received_date,
                        (v_line->>'rate')::numeric, (v_line->>'accepted_qty')::numeric, (v_line->>'accepted_qty')::numeric, true
                    );
                END LOOP;

                RETURN jsonb_build_object('success', true, 'id', v_header_id);
            END;
            $function$;
        `);
        console.log("Correct RPC Applied Successfully.");

    } catch (err) {
        console.error("RPC Fix Error:", err.message);
    } finally {
        pool.end();
    }
}
fixRpc();
