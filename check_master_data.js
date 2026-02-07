const { pool } = require('./config/db');

async function checkData() {
    try {
        const prodRes = await pool.query('SELECT id, product_name, purchase_rate FROM products LIMIT 5');
        console.log('--- PRODUCTS (Top 5) ---');
        console.table(prodRes.rows);

        const custRes = await pool.query('SELECT id, customer_name FROM customers LIMIT 5');
        console.log('\n--- CUSTOMERS (Top 5) ---');
        console.table(custRes.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
