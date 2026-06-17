const { pool } = require('../config/db');

async function checkLedger() {
    try {
        console.log('--- Journal Entries ---');
        const res = await pool.query("SELECT * FROM journal_entries WHERE reference_type = 'LOAN_DISB' AND reference_id IN (15, 16)");
        console.table(res.rows);

        if (res.rows.length > 0) {
            const ids = res.rows.map(r => r.id).join(',');
            console.log('--- Journal Lines ---');
            const lines = await pool.query(`SELECT * FROM journal_lines WHERE journal_entry_id IN (${ids}) ORDER BY journal_entry_id, id`);
            console.table(lines.rows);
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkLedger();
