const { pool } = require('./config/db');
async function checkPayments() {
    try {
        const res = await pool.query(`SELECT status, COUNT(*), SUM(amount) as total FROM customer_payments WHERE payment_date >= '2026-04-01' GROUP BY status`);
        console.log("Payments in April 2026:");
        console.table(res.rows);
        
        const countRes = await pool.query(`SELECT COUNT(*) FROM customer_payments WHERE status = 'Verified' AND payment_date >= '2026-04-01'`);
        console.log("Verified payments in April:", countRes.rows[0].count);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkPayments();
