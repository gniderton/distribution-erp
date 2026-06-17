const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`
        SELECT id, month, year, net_salary, misc_liabilities, created_at 
        FROM employee_salaries 
        WHERE employee_id = 3 AND created_at >= '2026-04-30'
    `);
    console.table(res.rows);
    process.exit();
}
run();
