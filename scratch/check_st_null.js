const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'stock_traceability' AND column_name = 'product_id'`);
    console.table(res.rows);
    process.exit();
}
run();
