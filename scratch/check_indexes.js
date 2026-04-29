const { pool } = require('../config/db');

async function checkIndexes() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'stock_traceability'
        `);
        console.table(res.rows);
    } finally {
        client.release();
        await pool.end();
    }
}

checkIndexes();
