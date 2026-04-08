const { pool } = require('./config/db');

async function checkBatchesSchema() {
    try {
        console.log('--- inventory_batches Columns ---');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_batches' 
            ORDER BY ordinal_position
        `);
        console.table(res.rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkBatchesSchema();
