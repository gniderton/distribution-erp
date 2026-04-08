const { pool } = require('./config/db');
async function run() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT count(*) as count, delivery_status 
            FROM sales_invoices 
            WHERE sales_order_id IS NULL 
            GROUP BY delivery_status
        `);
        console.table(res.rows);
        
        const sample = await client.query(`
            SELECT id, invoice_number, sales_order_id, delivery_status 
            FROM sales_invoices 
            WHERE sales_order_id IS NULL 
            LIMIT 5
        `);
        console.table(sample.rows);
    } finally {
        client.release();
        process.exit();
    }
}
run();
