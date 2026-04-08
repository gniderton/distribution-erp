const { pool } = require('./config/db');
async function check() {
    try {
        const si = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_invoices'`);
        console.log("sales_invoices:", si.rows.map(r => r.column_name));
        const sr = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_returns'`);
        console.log("sales_returns:", sr.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
check();
