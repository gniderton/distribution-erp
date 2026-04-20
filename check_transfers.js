const { pool } = require('./config/db');

async function check() {
    try {
        const jeId = 1993;
        const lines = await pool.query('SELECT * FROM journal_lines WHERE journal_entry_id = $1', [jeId]);
        console.log(`\nJournal Entries for JE #${jeId}:`);
        console.table(lines.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
