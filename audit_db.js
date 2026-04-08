const { pool } = require('./config/db');

async function audit() {
    try {
        const r = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'bank_statement_entries'::regclass
        `);
        console.table(r.rows);
    } catch (e) {
        console.error("Audit Failed:", e.message);
    } finally {
        pool.end();
    }
}

audit();
