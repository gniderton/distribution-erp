const { pool } = require('./config/db');

async function listTables() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables:', result.rows.map(r => r.table_name));
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        pool.end();
    }
}

listTables();
