const { pool } = require('./config/db');
async function checkBanks() {
    try {
        const res = await pool.query(`SELECT id, bank_name, account_number FROM bank_accounts`);
        process.stdout.write(JSON.stringify(res.rows));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkBanks();
