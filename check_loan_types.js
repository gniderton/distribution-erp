const { pool } = require('./config/db');
async function checkLoanTypes() {
    try {
        const res = await pool.query(`SELECT DISTINCT loan_type FROM loans`);
        process.stdout.write(JSON.stringify(res.rows.map(r => r.loan_type)));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkLoanTypes();
