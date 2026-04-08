const { pool } = require('./config/db');
async function checkJL() {
    try {
        const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'journal_lines'`);
        process.stdout.write(JSON.stringify(res.rows));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkJL();
