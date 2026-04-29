const { pool } = require('../config/db');

async function analyzeSchema() {
    const client = await pool.connect();
    const tables = [
        'inventory_batches', 
        'stock_traceability'
    ];
    
    try {
        for (const table of tables) {
            const res = await client.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);
            
            console.log(`\n--- Table: ${table} ---`);
            console.table(res.rows);
        }
    } catch (err) {
        console.error('Schema analysis error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

analyzeSchema();
