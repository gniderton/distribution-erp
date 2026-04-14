const { pool } = require('./config/db');

async function checkVersions() {
    try {
        const v1 = await pool.query("SELECT count(*) as count FROM journal_lines");
        const v2 = await pool.query("SELECT count(*) as count FROM journal_lines_v2");
        console.log('V1 (journal_lines) Count:', v1.rows[0].count);
        console.log('V2 (journal_lines_v2) Count:', v2.rows[0].count);
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}

checkVersions();
