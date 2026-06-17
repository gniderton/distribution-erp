const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`
        SELECT id, amount, description, status, invoice_id, salary_payment_id, created_at 
        FROM employee_liabilities 
        WHERE employee_id = 3
    `);
    console.table(res.rows);
    process.exit();
}
run();
