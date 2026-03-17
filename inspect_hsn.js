const { pool } = require('./config/db');

async function inspectHSN() {
    try {
        const result = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'hsn_codes'
        `);
        console.log('Columns in hsn_codes:', result.rows.map(r => r.column_name));
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        pool.end();
    }
}

inspectHSN();
