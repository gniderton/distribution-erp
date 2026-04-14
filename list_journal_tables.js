const { pool } = require('./config/db');

async function listJournalTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%journal%'");
        console.table(res.rows);
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}

listJournalTables();
