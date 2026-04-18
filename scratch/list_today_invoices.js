const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listTodayInvoices() {
    try {
        const query = `
            SELECT 
                si.id, 
                si.invoice_number, 
                si.grand_total, 
                si.created_at,
                c.customer_name
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            WHERE si.created_at >= CURRENT_DATE
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

listTodayInvoices();
