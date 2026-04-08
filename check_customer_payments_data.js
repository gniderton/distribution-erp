const { pool } = require('./config/db');
async function checkCP() {
    try {
        const res = await pool.query(`SELECT id, amount, payment_mode, deposit_bank, bank_name, bank_id FROM customer_payments WHERE payment_mode IN ('NEFT', 'UPI', 'Cheque') LIMIT 10`);
        console.table(res.rows);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkCP();
