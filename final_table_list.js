const { pool } = require('./config/db');
async function listAll() {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const list = res.rows.map(r => r.table_name);
    console.log("--- START LIST ---");
    console.log(list.join('\n'));
    console.log("--- END LIST ---");
    pool.end();
}
listAll();
