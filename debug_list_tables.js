const { pool } = require('./config/db');
async function listAll() {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log(res.rows.map(r => r.table_name).join('\n'));
    pool.end();
}
listAll();
