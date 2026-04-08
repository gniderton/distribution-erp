const { pool } = require('./config/db');

async function checkModes() {
    try {
        const query = `SELECT DISTINCT payment_mode FROM customer_payments`;
        const result = await pool.query(query);
        console.log("--- Unique Payment Modes ---");
        console.table(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkModes();
