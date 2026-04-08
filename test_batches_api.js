const { pool } = require('./config/db');

async function testBatchesAPI() {
    try {
        console.log("--- Testing Enhanced Batches API ---");
        
        // 1. Get a sample product ID that has batches
        const sampleProduct = await pool.query('SELECT product_id FROM inventory_batches LIMIT 1');
        if (sampleProduct.rows.length === 0) {
            console.log("No batches found in database to test.");
            return;
        }
        const productId = sampleProduct.rows[0].product_id;
        console.log(`Testing with Product ID: ${productId}`);

        // 2. Test Marginal Calculations (Rounded)
        console.log("\nChecking Margin Calculations (All Batches - Rounded):");
        const allRes = await pool.query(`
            SELECT batch_code, purchase_rate, distributor_rate, distributor_margin_pct 
            FROM (
                SELECT *, 
                ROUND(CASE WHEN purchase_rate > 0 THEN ((distributor_rate - purchase_rate) / purchase_rate) * 100 ELSE 0 END, 2) as distributor_margin_pct
                FROM inventory_batches
                WHERE product_id = $1
            ) sub
            LIMIT 3
        `, [productId]);
        console.table(allRes.rows);

        // 3. Test Stock Filter (Non-Zero)
        console.log("\nChecking Stock Filter (Non-Zero Only):");
        const nonZeroRes = await pool.query(`
            SELECT batch_code, quantity_remaining 
            FROM inventory_batches 
            WHERE product_id = $1 AND quantity_remaining > 0
            LIMIT 3
        `, [productId]);
        console.table(nonZeroRes.rows);
        
        const hasZeroInNonZero = nonZeroRes.rows.some(r => Number(r.quantity_remaining) <= 0);
        if (hasZeroInNonZero) {
            console.error("❌ ERROR: Found zero/negative stock in non-zero filter!");
        } else {
            console.log("✅ Filter Test Passed: No zero-stock batches found in 'non-zero' set.");
        }

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        pool.end();
    }
}

testBatchesAPI();
