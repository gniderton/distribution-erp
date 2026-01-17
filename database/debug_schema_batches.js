const { pool } = require('../config/db');

async function checkSchema() {
    try {
        console.log("Fetching columns for product_batches...");
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'product_batches'
        `);
        console.table(res.rows);
    } catch (err) {
        console.error("Schema Check Error:", err.message);
    } finally {
        pool.end();
    }
}
checkSchema();
