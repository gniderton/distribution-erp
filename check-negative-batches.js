const { pool } = require('./config/db');

async function checkNegativeBatches() {
    try {
        const res = await pool.query(`
            SELECT 
                ib.id, ib.product_id, p.product_name as product_name, ib.batch_code, 
                ib.quantity_remaining, ib.created_at
            FROM inventory_batches ib
            JOIN products p ON p.id = ib.product_id
            WHERE ib.product_id = 167
            ORDER BY ib.created_at DESC
            LIMIT 10
        `);
        console.table(res.rows);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        pool.end();
    }
}
checkNegativeBatches();
