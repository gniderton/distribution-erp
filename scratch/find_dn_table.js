const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%debit%note%alloc%'`);
    console.table(res.rows);
    process.exit();
}
run();
