const { pool } = require('./config/db');

async function run() {
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT 
                si.invoice_number as "Invoice Number",
                TO_CHAR(si.invoice_date, 'YYYY-MM-DD') as "Date",
                c.customer_name as "Customer",
                si.total_taxable as "Revenue",
                (
                    SELECT SUM(sil.shipped_qty * ib.purchase_rate)
                    FROM sales_invoice_lines sil
                    JOIN inventory_batches ib ON sil.batch_id = ib.id
                    WHERE sil.invoice_id = si.id
                ) as "COGS",
                si.total_taxable - (
                    SELECT SUM(sil.shipped_qty * ib.purchase_rate)
                    FROM sales_invoice_lines sil
                    JOIN inventory_batches ib ON sil.batch_id = ib.id
                    WHERE sil.invoice_id = si.id
                ) as "Gross Margin ($)",
                ROUND(((si.total_taxable - (
                    SELECT SUM(sil.shipped_qty * ib.purchase_rate)
                    FROM sales_invoice_lines sil
                    JOIN inventory_batches ib ON sil.batch_id = ib.id
                    WHERE sil.invoice_id = si.id
                )) / NULLIF(si.total_taxable, 0)) * 100, 2) as "Gross Margin (%)"
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            WHERE si.status != 'Cancelled'
            ORDER BY si.invoice_date DESC
            LIMIT 5
        `);
        console.table(res.rows);
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
