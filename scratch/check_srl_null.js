const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'sales_return_lines' AND column_name = 'product_id'`);
    console.table(res.rows);
    process.exit();
}
run();
