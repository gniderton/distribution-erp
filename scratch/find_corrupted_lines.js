const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findCorruptedLines() {
    try {
        const query = `
            SELECT 
                si.id as invoice_id, 
                si.invoice_number, 
                c.customer_name,
                sil.id as line_id,
                p.product_name,
                sil.shipped_qty,
                sil.rate,
                sil.amount,
                si.created_at
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            JOIN products p ON sil.product_id = p.id
            WHERE sil.rate = 0 
              AND si.created_at >= '2026-04-16'
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

findCorruptedLines();
