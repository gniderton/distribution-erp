const { pool } = require('./config/db');

async function run() {
    try {
        console.log("💉 Injecting Stock for Test...");
        const pid = 101;
        const qty = 100;
        const mrp = 150;
        const rate = 100;

        // Check if product exists
        const pRes = await pool.query('SELECT id FROM products WHERE id = $1', [pid]);
        if (pRes.rows.length === 0) {
            console.log("Product 101 NOT FOUND! Creating dummy...");
            await pool.query(`
                INSERT INTO products (id, product_name, product_code, mrp, purchase_rate, tax_id)
                VALUES (101, 'Test Product', 'TEST-101', 150, 80, 1) -- tax_id 1 assumption
            `);
        }

        await pool.query(`
            INSERT INTO inventory_batches (
                product_id, batch_code, initial_quantity, quantity_remaining, 
                purchase_rate, dealer_rate, mrp, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        `, [pid, 'BATCH-TEST-001', qty, qty, rate, rate, mrp]);

        console.log("✅ Stock Injected.");

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
