const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT base_salary, adjusted_base_salary, leave_deduction, advance_deduction, loan_deduction, misc_liabilities, total_deductions, net_salary FROM employee_salaries WHERE id = 12`);
    console.table(res.rows);
    process.exit();
}
run();
