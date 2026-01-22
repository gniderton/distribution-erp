const { pool } = require('../config/db');

async function verifyStockMove() {
    try {
        console.log('--- Verifying Last Stock Adjustment ---');

        // 1. Get the most recent Adjustment
        const adjRes = await pool.query(`
            SELECT * FROM stock_adjustments 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (adjRes.rows.length === 0) {
            console.log('❌ No Stock Adjustments found.');
            return;
        }

        const adj = adjRes.rows[0];
        console.log('1. Latest Adjustment Record:');
        console.table([adj]);

        const productId = adj.product_id;

        // 2. Check Product Summary (Damaged Bucket)
        const prodRes = await pool.query(`
            SELECT id, product_name, current_stock, damaged_stock 
            FROM products 
            WHERE id = $1
        `, [productId]);

        console.log('\n2. Product State (Summary):');
        console.table(prodRes.rows);

        // 3. Check Inventory Batches (Good Stock) remaining
        const batchRes = await pool.query(`
            SELECT id, batch_code, quantity_initial, quantity_remaining, created_at 
            FROM inventory_batches 
            WHERE product_id = $1
            ORDER BY created_at ASC
        `, [productId]);

        console.log('\n3. Inventory Batches (Good Stock):');
        console.table(batchRes.rows);

        console.log('\n--- Analysis ---');
        console.log(`Moved Qty: ${adj.qty} | Reason: ${adj.reason}`);
        if (['Damage', 'Expiry'].includes(adj.reason)) {
            console.log(`Expected: 'damaged_stock' should have increased by ${adj.qty}.`);
            console.log(`Expected: 'quantity_remaining' in batches should have decreased by ${adj.qty}.`);
        } else if (adj.reason === 'Found') {
            console.log(`Expected: New Batch Created or Quantity Increased.`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

verifyStockMove();
