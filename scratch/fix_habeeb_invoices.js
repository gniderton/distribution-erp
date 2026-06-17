const { pool } = require('../config/db');
async function run() {
    await pool.query(`UPDATE sales_invoices SET paid_amount = amount_paid, balance_amount = grand_total - amount_paid WHERE id IN (344, 1453)`);
    console.log('Invoices 344 and 1453 balances synchronized.');
    process.exit();
}
run();
