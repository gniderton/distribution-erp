const { pool } = require('./config/db');

async function run() {
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT * FROM customer_advances WHERE customer_id = 278");
        console.table(res.rows);
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
