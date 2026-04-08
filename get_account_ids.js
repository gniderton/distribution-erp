const { pool } = require('./config/db');
async function getAccountIds() {
    try {
        const res = await pool.query(`SELECT id, code FROM chart_of_accounts WHERE code IN (1001, 1010, 1011, 1012, 2001, 5003)`);
        console.log(JSON.stringify(res.rows));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
getAccountIds();
