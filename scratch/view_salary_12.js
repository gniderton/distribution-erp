const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT * FROM employee_salaries WHERE id = 12`);
    console.table(res.rows);
    process.exit();
}
run();
