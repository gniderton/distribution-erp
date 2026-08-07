const { pool } = require('./config/db');

async function run() {
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log(res.rows.map(r => r.table_name).join(', '));
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
