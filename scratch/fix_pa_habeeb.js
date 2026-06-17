const { pool } = require('../config/db');
async function run() {
    await pool.query(`UPDATE sales_invoices SET paid_amount = amount_paid WHERE id IN (344, 1453)`);
    console.log('paid_amount updated for invoices 344 and 1453.');
    process.exit();
}
run();
