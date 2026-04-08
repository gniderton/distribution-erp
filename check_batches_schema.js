const { pool } = require('./config/db');

async function checkSchema() {
    try {
        const query = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_batches'
            ORDER BY ordinal_position;
        `;
        const result = await pool.query(query);
        console.table(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();
