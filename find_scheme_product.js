const { pool } = require('./config/db');
async function findSchemeProduct() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT sr.trigger_id as product_id, s.scheme_name, sr.min_qty
            FROM scheme_rules sr
            JOIN schemes s ON sr.scheme_id = s.id
            WHERE s.is_active = true AND sr.trigger_type = 'Product'
            LIMIT 5
        `);
        console.table(res.rows);
    } finally {
        client.release();
        process.exit();
    }
}
findSchemeProduct();
