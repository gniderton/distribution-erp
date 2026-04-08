const { pool } = require('./config/db');
async function checkStatus() {
    try {
        const res = await pool.query(`SELECT status, verification_status, COUNT(*) FROM customer_payments WHERE payment_date >= '2026-04-01' GROUP BY status, verification_status`);
        console.log("Payment status analysis (April 2026):");
        console.table(res.rows);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkStatus();
