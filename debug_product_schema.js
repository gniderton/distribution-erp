const { pool } = require('./config/db');

async function checkSchema() {
    try {
        const res = await pool.query("SELECT * FROM products LIMIT 1");
        console.log("Product Columns:", Object.keys(res.rows[0] || {}));
    } catch (e) {
        console.error(e);
    }
}
checkSchema();
