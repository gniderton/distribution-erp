const { pool } = require('./config/db');
async function audit() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        console.log('TABLES|' + JSON.stringify(res.rows.map(r => r.table_name)));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
audit();
