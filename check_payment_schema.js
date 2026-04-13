const { pool } = require('./config/db');
async function check() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'customer_payments'");
        console.log('COLS|' + JSON.stringify(res.rows));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
