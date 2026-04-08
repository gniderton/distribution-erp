const { pool } = require('./config/db');
async function checkLedgerTypes() {
    try {
        const res = await pool.query(`SELECT DISTINCT type FROM view_customer_ledger`);
        console.log("Customer Ledger Types:", res.rows.map(r => r.type));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkLedgerTypes();
