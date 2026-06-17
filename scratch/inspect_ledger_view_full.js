const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT definition FROM pg_views WHERE viewname = 'view_customer_ledger'`);
    const def = res.rows[0].definition;
    // Look for the customer_payments part
    console.log(def);
    process.exit();
}
run();
