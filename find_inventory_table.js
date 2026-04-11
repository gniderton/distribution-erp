
const { pool } = require('./config/db');

async function findStockTable() {
    try {
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name ILIKE '%inventory%' OR table_name ILIKE '%batch%' OR table_name ILIKE '%stock%')
        `);
        console.log('Tables:', tablesRes.rows.map(r => r.table_name));

        // Try common names
        const possibleTables = ['product_batches', 'inventory_batches', 'stock_batches', 'inventory'];
        for (const table of possibleTables) {
            try {
                const res = await pool.query(`SELECT * FROM ${table} WHERE id = 98`);
                if (res.rows.length > 0) {
                    console.log(`Found in table ${table}:`, JSON.stringify(res.rows[0]));
                    return;
                }
            } catch (e) {}
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

findStockTable();
