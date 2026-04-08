const { pool } = require('./config/db');
async function check() {
    try {
        const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_lines'`);
        console.log(res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
check();
