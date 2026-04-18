const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findConfirmedSO() {
    try {
        const res = await pool.query("SELECT id, so_number FROM sales_orders WHERE status = 'Confirmed' LIMIT 1");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findConfirmedSO();
