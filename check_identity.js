const { pool } = require('./config/db');
async function check() {
    try {
        const coa = await pool.query('SELECT id, name FROM chart_of_accounts WHERE id IN (1, 2, 3)');
        console.log('TABLE_COA|' + JSON.stringify(coa.rows));
        const banks = await pool.query('SELECT id, bank_name FROM bank_accounts WHERE id IN (1, 2, 3)');
        console.log('TABLE_BANKS|' + JSON.stringify(banks.rows));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
