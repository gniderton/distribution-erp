const { pool } = require('../config/db');

async function check() {
    try {
        console.log('--- Latest 5 Payments ---');
        const payments = await pool.query(`
            SELECT id, vendor_id, amount, transaction_type, created_at 
            FROM vendor_payments 
            ORDER BY id DESC LIMIT 5
        `);
        console.table(payments.rows);

        console.log('\n--- Latest 5 Ledger Entries (View) ---');
        const ledger = await pool.query(`
            SELECT * FROM view_vendor_ledger 
            ORDER BY date DESC, created_at DESC LIMIT 5
        `);
        console.table(ledger.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
