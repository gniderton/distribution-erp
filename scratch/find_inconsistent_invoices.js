const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`
        SELECT id, invoice_number, grand_total, paid_amount, amount_paid 
        FROM sales_invoices 
        WHERE paid_amount != amount_paid
    `);
    console.log(`Found ${res.rows.length} inconsistent invoices.`);
    if (res.rows.length > 0) {
        console.table(res.rows);
    }
    process.exit();
}
run();
