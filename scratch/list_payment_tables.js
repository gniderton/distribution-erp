const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%payment%'`);
    console.table(res.rows);
    process.exit();
}
run();
