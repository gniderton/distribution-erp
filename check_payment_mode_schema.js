const { pool } = require('./config/db');
async function check() {
    const tables = ['expenses', 'loan_transactions', 'employee_advances', 'customer_payments', 'vendor_payments', 'other_income', 'internal_transfers', 'cheques', 'asset_transactions'];
    try {
        console.log('🕵️ AUDITING TABLE SCHEMAS FOR PAYMENT_MODE...');
        for (const t of tables) {
            const res = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = 'payment_mode'
            `, [t]);
            console.log(`${t}: ${res.rows.length > 0 ? '✅ HAS payment_mode' : '❌ MISSING payment_mode'}`);
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
