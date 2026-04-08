const { pool } = require('./config/db');

async function cleanup() {
    const idsToDelete = [155, 156, 154, 157, 151, 153, 142, 160];
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const r = await client.query('DELETE FROM bank_statement_entries WHERE id = ANY($1)', [idsToDelete]);
        await client.query('COMMIT');
        console.log(`SUCCESS: Purged ${r.rowCount} duplicate/broken entries.`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Cleanup Failed:", e.message);
    } finally {
        client.release();
        pool.end();
    }
}

cleanup();
