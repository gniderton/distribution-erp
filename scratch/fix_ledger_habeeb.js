const { pool } = require('../config/db');
async function run() {
    await pool.query(`UPDATE customer_payments SET verification_status = 'Verified' WHERE transaction_ref IN ('EMP-LIAB-3', 'EMP-LIAB-4')`);
    console.log('Habeebs payments verified in ledger.');
    process.exit();
}
run();
