const { pool } = require('./config/db');
async function checkAccounting() {
    try {
        const it = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'internal_transfers'`);
        console.log("internal_transfers:", it.rows.map(r => r.column_name));

        const lt = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'loan_transactions'`);
        console.log("loan_transactions:", lt.rows.map(r => r.column_name));

        const loans = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'loans'`);
        console.log("loans:", loans.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkAccounting();
