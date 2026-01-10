const { pool } = require('../config/db');

async function check() {
    try {
        console.log('--- Bank Accounts in DB ---');
        const res = await pool.query('SELECT * FROM bank_accounts');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
