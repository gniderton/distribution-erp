const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT id, customer_id, amount, payment_mode, transaction_ref, status FROM customer_payments WHERE transaction_ref LIKE 'EMP-LIAB-%'`);
    console.table(res.rows);
    process.exit();
}
run();
