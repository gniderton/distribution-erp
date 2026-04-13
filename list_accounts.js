const { pool } = require('./config/db');
async function list() {
    try {
        const res = await pool.query('SELECT id, name, code FROM chart_of_accounts ORDER BY id');
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
list();
