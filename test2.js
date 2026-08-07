const { pool } = require('./config/db');

async function run() {
    try {
        const res = await pool.query(`
            SELECT id, payment_mode, transaction_ref, amount 
            FROM customer_payments 
            WHERE payment_mode ILIKE '%Credit Note%' OR transaction_ref ILIKE '%CN%' OR transaction_ref ILIKE '%SR%'
            LIMIT 5
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
