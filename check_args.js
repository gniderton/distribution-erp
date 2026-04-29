const { pool } = require('./config/db');
async function check() {
    const r = await pool.query("SELECT pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'create_purchase_invoice'");
    console.log(r.rows);
    await pool.end();
}
check();
