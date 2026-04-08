const { pool } = require('./config/db');
async function run() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT * FROM customer_payment_allocations WHERE invoice_id = 618');
        console.table(res.rows);
    } finally {
        client.release();
        process.exit();
    }
}
run();
