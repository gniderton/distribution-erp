const { pool } = require('../config/db');

async function compareBillings() {
    try {
        const PIDS = [222, 224];
        
        console.log("--- 1. SUCCESSFUL BILLINGS FOR 222/224 (14th-16th) ---");
        const successRes = await pool.query(`
            SELECT 
                si.id as invoice_id, 
                si.invoice_number, 
                si.invoice_date,
                c.customer_name,
                ch.price_column,
                sil.product_id,
                sil.shipped_qty,
                sil.batch_id,
                ib.batch_code,
                ib.expiry_date
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            JOIN channels ch ON c.channel_id = ch.id
            JOIN inventory_batches ib ON sil.batch_id = ib.id
            WHERE sil.product_id = ANY($1)
              AND si.invoice_date::date >= '2026-04-14'
            ORDER BY si.invoice_date DESC
        `, [PIDS]);
        console.table(successRes.rows);

        console.log("\n--- 2. FAILED BILLINGS (MISSING FROM INVOICE BUT IN SO) ---");
        const failRes = await pool.query(`
            SELECT 
                so.id as order_id, 
                so.so_number, 
                c.customer_name,
                ch.price_column,
                sol.product_id,
                sol.ordered_qty,
                sol.dispatched_qty
            FROM sales_order_lines sol
            JOIN sales_orders so ON sol.sales_order_id = so.id
            JOIN customers c ON so.customer_id = c.id
            JOIN channels ch ON c.channel_id = ch.id
            WHERE sol.product_id = ANY($1)
              AND sol.dispatched_qty < sol.ordered_qty
              AND so.order_date::date >= '2026-04-14'
        `, [PIDS]);
        console.table(failRes.rows);

    } catch (err) {
        console.error("Comparison Error:", err);
    } finally {
        await pool.end();
    }
}

compareBillings();
