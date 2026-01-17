const { pool } = require('../config/db');

async function run() {
    try {
        console.log("Running Query...");
        const result = await pool.query(`
            SELECT 
                pi.id,
                pi.invoice_number,
                pi.vendor_invoice_number,
                pi.vendor_id,
                pi.vendor_invoice_date,
                pi.received_date,
                pi.status,
                pi.grand_total,
                COALESCE(pa.paid_amount, 0) as paid_amount,
                COALESCE(dn.dn_amount, 0) as dn_amount,
                (pi.grand_total - COALESCE(pa.paid_amount, 0) - COALESCE(dn.dn_amount, 0)) as balance,
                v.vendor_name as vendor_name,
                ph.po_number,
                (
                    SELECT json_agg(json_build_object(
                        '_product_id', pl.product_id,
                        'Qty', pl.accepted_qty,
                        'Price', pl.rate,
                        'Disc %', pl.discount_percent,
                        'Sch', pl.scheme_amount,
                        'GST $', pl.tax_amount,
                        'Net $', pl.amount,
                        'Batch No', pl.batch_number,
                        'expiry_date', (SELECT expiry_date FROM product_batches pb WHERE pb.purchase_invoice_line_id = pl.id LIMIT 1) 
                    ))
                    FROM purchase_invoice_lines pl
                    WHERE pl.purchase_invoice_header_id = pi.id
                ) as lines_json
            FROM purchase_invoice_headers pi
            JOIN vendors v ON pi.vendor_id = v.id
            LEFT JOIN purchase_order_headers ph ON pi.purchase_order_id = ph.id
            LEFT JOIN (
                SELECT purchase_invoice_id, SUM(amount) as paid_amount 
                FROM payment_allocations 
                GROUP BY purchase_invoice_id
            ) pa ON pi.id = pa.purchase_invoice_id
            LEFT JOIN (
                SELECT purchase_invoice_id, SUM(amount) as dn_amount 
                FROM debit_note_allocations 
                GROUP BY purchase_invoice_id
            ) dn ON pi.id = dn.purchase_invoice_id
            ORDER BY pi.id DESC
        `);
        console.log("Success! Rows:", result.rows.length);
        if (result.rows.length > 0) {
            console.log("First Row Lines:", JSON.stringify(result.rows[0].lines_json));
        }
    } catch (err) {
        console.error("QUERY ERROR:", err.message);
    } finally {
        pool.end();
    }
}
run();
