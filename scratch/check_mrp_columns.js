const { Pool } = require('pg');
const { pool } = require('../config/db');

async function check() {
    try {
        console.log("Checking columns of tables...");
        
        const silRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sales_invoice_lines' AND column_name = 'mrp'");
        console.log("sales_invoice_lines mrp column:", silRes.rows);

        const ibRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inventory_batches' AND column_name = 'mrp'");
        console.log("inventory_batches mrp column:", ibRes.rows);

        const pRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'mrp'");
        console.log("products mrp column:", pRes.rows);
        
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
