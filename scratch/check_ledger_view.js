const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT definition FROM pg_views WHERE viewname = 'view_customer_ledger'`);
    if (res.rows.length > 0) {
        console.log(res.rows[0].definition);
    } else {
        console.log("View not found");
    }
    process.exit();
}
run();
