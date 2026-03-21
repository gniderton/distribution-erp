const { pool } = require('../config/db');

async function run() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(JSON.stringify(res.rows.map(r => r.table_name), null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
