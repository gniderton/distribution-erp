const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT id, full_name FROM employees WHERE full_name ILIKE '%Habeeb%'`);
    console.table(res.rows);
    process.exit();
}
run();
