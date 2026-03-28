const { pool } = require('./config/db');

async function check() {
    const client = await pool.connect();
    try {
        const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_lines'");
        console.log('Journal Lines Columns:', cols.rows.map(r => r.column_name));
        
        const count = await client.query("SELECT count(*) FROM journal_lines WHERE account_id IN (5010, 5011)");
        console.log('Lines using 5010 or 5011:', count.rows[0].count);

        const undefinedEntries = await client.query("SELECT count(*) FROM journal_entries WHERE description LIKE '%undefined%'");
        console.log('Entries with undefined:', undefinedEntries.rows[0].count);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}

check();
