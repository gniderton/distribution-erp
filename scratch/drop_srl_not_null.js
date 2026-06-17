const { pool } = require('../config/db');
async function run() {
    await pool.query(`ALTER TABLE sales_return_lines ALTER COLUMN product_id DROP NOT NULL`);
    console.log('Database updated: product_id is now nullable in sales_return_lines.');
    process.exit();
}
run();
