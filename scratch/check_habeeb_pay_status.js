const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT id, status, verification_status, is_active FROM customer_payments WHERE id IN (1584, 1586)`);
    console.table(res.rows);
    process.exit();
}
run();
