const { pool } = require('./config/db');

async function inspectInventorySchema() {
    const client = await pool.connect();
    try {
        console.log("🔍 Inspecting inventory_batches columns...");
        const ibCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_batches'
            ORDER BY ordinal_position
        `);
        ibCols.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit();
    }
}

inspectInventorySchema();
