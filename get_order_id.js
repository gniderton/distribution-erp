const { pool } = require('./config/db');

async function getID() {
    try {
        const res = await pool.query("SELECT id FROM sales_orders WHERE so_number = 'SO-TEST-ORDER-6'");
        console.log("Order 6 ID:", res.rows[0]?.id);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getID();
