const { pool } = require('./config/db');

async function debug() {
    try {
        console.log("--- 7. Inspecting Sale Lines for Invoice 12 ---");
        const silRes = await pool.query(`
            SELECT sil.id, sil.product_id, sil.batch_id, sil.shipped_qty, sil.rate, sil.taxable_amount, si.sales_order_id
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            WHERE sil.invoice_id = 12 AND sil.product_id = 81
        `);
        console.table(silRes.rows);

        if (silRes.rows.length > 0 && silRes.rows[0].sales_order_id) {
            console.log("\n--- 8. Inspecting Sales Order Lines for the same Sale ---");
            const solRes = await pool.query(`
                SELECT id, product_id, batch_id, qty, rate, taxable_amount
                FROM sales_order_lines
                WHERE sales_order_id = $1 AND product_id = 81
            `, [silRes.rows[0].sales_order_id]);
            console.table(solRes.rows);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
