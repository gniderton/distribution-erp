const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findZeroInvoices() {
    try {
        const query = `
            SELECT 
                si.id, 
                si.invoice_number, 
                si.customer_id, 
                si.grand_total, 
                si.sales_order_id,
                si.created_at,
                json_agg(json_build_object(
                    'product_id', sil.product_id, 
                    'shipped_qty', sil.shipped_qty, 
                    'rate', sil.rate, 
                    'amount', sil.amount,
                    'batch_id', sil.batch_id
                )) as lines
            FROM sales_invoices si
            JOIN sales_invoice_lines sil ON si.id = sil.invoice_id
            WHERE sil.rate = 0 
              AND si.created_at >= '2026-04-15'
            GROUP BY si.id
            ORDER BY si.created_at DESC
        `;
        const res = await pool.query(query);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findZeroInvoices();
