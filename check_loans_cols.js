const { pool } = require('./config/db');
async function checkLoans() {
    try {
        const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'loans'`);
        process.stdout.write(JSON.stringify(res.rows.map(r => r.column_name)));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkLoans();
