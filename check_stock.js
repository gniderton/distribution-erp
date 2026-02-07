const { pool } = require('./config/db');

async function check() {
    try {
        console.log("🔍 Checking Stock for Product 101...");
        const res = await pool.query(`
            SELECT id, batch_code, quantity_remaining, is_active 
            FROM inventory_batches 
            WHERE product_id = 101
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
