const { pool } = require('./config/db');

async function reset() {
    try {
        await pool.query('TRUNCATE TABLE customers CASCADE');
        await pool.query('TRUNCATE TABLE employees CASCADE');
        await pool.query('TRUNCATE TABLE routes CASCADE');
        await pool.query('TRUNCATE TABLE document_sequences CASCADE');
        await pool.query('TRUNCATE TABLE channels CASCADE');
        console.log("✅ Master Data Reset Complete");
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

reset();
