const { pool } = require('./config/db');

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'purchase_invoice_headers'
            ORDER BY ordinal_position
        `);
        console.log("--- COLUMNS IN purchase_invoice_headers ---");
        res.rows.forEach(row => console.log(row.column_name));
    } catch (err) {
        console.error("Schema Check Error:", err.message);
    } finally {
        process.exit();
    }
}

checkSchema();
