const { pool } = require('./config/db');
async function listTables() {
    try {
        const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        process.stdout.write(JSON.stringify(res.rows.map(r => r.table_name)));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
listTables();
