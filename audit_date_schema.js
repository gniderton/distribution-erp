const { pool } = require('./config/db');
async function check() {
    const tables = ['customer_payments', 'vendor_payments', 'expenses', 'other_income', 'internal_transfers', 'employee_advances', 'loan_transactions', 'asset_transactions', 'cheques'];
    try {
        console.log('🕵️ AUDITING DATE COLUMNS...');
        for (const t of tables) {
            const res = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [t]);
            const cols = res.rows.map(r => r.column_name);
            const dateCols = cols.filter(c => c.includes('date') || c.includes('at') || c.includes('time'));
            console.log(`${t}: ${dateCols.join(', ')}`);
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
