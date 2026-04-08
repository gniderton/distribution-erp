const { pool } = require('./config/db');
async function run() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT id, invoice_number, created_at, updated_at FROM sales_invoices WHERE id = 618");
        console.table(res.rows);
    } finally {
        client.release();
        process.exit();
    }
}
run();
