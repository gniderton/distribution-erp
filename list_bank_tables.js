const { pool } = require('./config/db');

async function listBankTables() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name ILIKE '%bank%'
        `);
        console.log('Tables:', result.rows.map(r => r.table_name));
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        pool.end();
    }
}

listBankTables();
