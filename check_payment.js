const { pool } = require('./config/db');

async function run() {
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT * FROM customer_payments WHERE id = 3165");
        console.table(res.rows);
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
