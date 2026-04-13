const { pool } = require('./config/db');
async function check() {
    try {
        const entries = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'journal_entries'");
        const lines = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'journal_lines'");
        console.log('ENTRIES|' + JSON.stringify(entries.rows));
        console.log('LINES|' + JSON.stringify(lines.rows));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
