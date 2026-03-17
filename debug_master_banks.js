const { pool } = require('./config/db');

async function listColumns() {
    try {
        const result = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'master_banks'
        `);
        console.log('Columns in master_banks:', result.rows.map(r => r.column_name));
        
        const dataResult = await pool.query(`
            SELECT * FROM master_banks LIMIT 1
        `);
        console.log('Sample Data:', dataResult.rows[0]);
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        pool.end();
    }
}

listColumns();
