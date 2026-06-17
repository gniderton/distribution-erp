const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT column_name, generation_expression FROM information_schema.columns WHERE table_name = 'sales_invoices' AND column_name = 'balance_amount'`);
    console.table(res.rows);
    process.exit();
}
run();
