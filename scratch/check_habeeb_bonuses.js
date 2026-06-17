const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT * FROM employee_bonuses WHERE employee_id = 3 AND salary_payment_id = 12`);
    console.table(res.rows);
    process.exit();
}
run();
