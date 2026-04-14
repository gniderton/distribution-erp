const { pool } = require('./config/db');
async function check() {
    try {
        const res = await pool.query("SELECT id, name, code FROM chart_of_accounts WHERE code IN ('1002', '1003')");
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
