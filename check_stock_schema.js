const { pool } = require('./config/db');
async function check() {
    const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stock_traceability' ORDER BY ordinal_position");
    console.log(r.rows);
    await pool.end();
}
check();
