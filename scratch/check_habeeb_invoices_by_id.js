const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`
        SELECT id, invoice_number, status, grand_total, paid_amount, balance_amount 
        FROM sales_invoices 
        WHERE id IN (344, 1453)
    `);
    console.table(res.rows);
    process.exit();
}
run();
