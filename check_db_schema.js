const { pool } = require('./config/db');

async function checkSchemas() {
    try {
        const tables = ['customers', 'products', 'inventory_batches'];
        for (const table of tables) {
            const res = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [table]);
            console.log(`--- ${table} ---`);
            console.log(res.rows.map(r => r.column_name).join(', '));
        }
    } catch (err) {
        console.error('Error checking schemas:', err);
    } finally {
        await pool.end();
    }
}

checkSchemas();
