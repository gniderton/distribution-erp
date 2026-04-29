const { pool } = require('../config/db');

async function checkPayments() {
    try {
        const res = await pool.query('SELECT id, status, verification_status, collected_by, payment_date FROM customer_payments LIMIT 10');
        console.log('Columns and data:', res.rows);
        
        const countRes = await pool.query('SELECT status, COUNT(*) FROM customer_payments GROUP BY status');
        console.log('Status counts:', countRes.rows);

        const vCountRes = await pool.query('SELECT verification_status, COUNT(*) FROM customer_payments GROUP BY verification_status');
        console.log('Verification Status counts:', vCountRes.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkPayments();
