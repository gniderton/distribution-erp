const { pool } = require('./config/db');

async function run() {
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT * FROM customer_payment_allocations WHERE invoice_id = 876");
        console.table(res.rows);
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
