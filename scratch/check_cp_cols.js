const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'customer_payments'`);
    console.table(res.rows);
    process.exit();
}
run();
