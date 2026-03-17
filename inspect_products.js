const { pool } = require('./config/db');

async function inspectProducts() {
    try {
        const result = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'products'
        `);
        console.log('Columns in products:', result.rows.map(r => r.column_name));
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        pool.end();
    }
}

inspectProducts();
