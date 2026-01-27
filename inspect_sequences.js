const { pool } = require('./config/db');

async function inspect() {
    try {
        const res = await pool.query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'document_sequences';
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

inspect();
