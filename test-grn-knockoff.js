const { pool } = require('./config/db');

async function testAutoKnockoff() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Find a random active product and vendor
        const pRes = await client.query('SELECT id, mrp FROM products LIMIT 1');
        const vRes = await client.query('SELECT id FROM vendors LIMIT 1');
        if (pRes.rows.length === 0 || vRes.rows.length === 0) throw new Error("Need product and vendor to test");
        
        const productId = pRes.rows[0].id;
        const vendorId = vRes.rows[0].id;
        const oldBatchCode = 'TEST_TRANSIT_OLD';
        const newBatchCode = 'TEST_GRN_NEW';

        // 1. Create a negative phantom batch
        const bRes = await client.query(`
            INSERT INTO inventory_batches (
                product_id, batch_code, mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate, 
                quantity_initial, quantity_remaining, is_active, status
            ) VALUES (
                $1, $2, $3, 100, 110, 115, 120, 130, 
                0, -90, false, 'Good'
            ) RETURNING id
        `, [productId, oldBatchCode, pRes.rows[0].mrp]);
        const oldBatchId = bRes.rows[0].id;
        
        console.log(`Created phantom batch ID ${oldBatchId} with qty -90`);

        // 2. Prepare JSON for GRN
        const linesJson = JSON.stringify([{
            product_id: productId,
            ordered_qty: 300,
            accepted_qty: 300,
            rate: 105,
            discount_percent: 0,
            discount_amount: 0,
            scheme_amount: 0,
            tax_amount: 0,
            amount: 300 * 105,
            mrp: 150,
            batch_number: newBatchCode,
            expiry_date: '2027-01-01'
        }]);

        // 3. Call the function
        const grnRes = await client.query(`
            SELECT create_purchase_invoice(
                $1, 0, 'INV_TEST_123', CURRENT_DATE, CURRENT_DATE, 
                $2, 0, $2, $3::jsonb
            )
        `, [vendorId, 300 * 105, linesJson]);
        
        console.log("GRN Created:", grnRes.rows[0]);

        // 4. Verify the database state
        const checkRes = await client.query(`
            SELECT id, batch_code, quantity_remaining, mrp, expiry_date, is_active 
            FROM inventory_batches 
            WHERE product_id = $1 
            AND batch_code IN ($2, $3)
            ORDER BY id ASC
        `, [productId, oldBatchCode, newBatchCode]);

        console.log("Batches found after GRN:");
        console.table(checkRes.rows);

        // Verification logic
        const oldBatch = checkRes.rows.find(r => r.id === oldBatchId);
        const newBatch = checkRes.rows.find(r => r.id !== oldBatchId);

        if (oldBatch && Number(oldBatch.quantity_remaining) === 0 && oldBatch.batch_code === newBatchCode) {
            console.log("SUCCESS: Phantom batch was successfully zeroed out and its batch code was synced!");
        } else {
            console.log("FAILED: Phantom batch not updated correctly.", oldBatch);
        }

        if (newBatch && Number(newBatch.quantity_remaining) === 210) {
            console.log("SUCCESS: New batch has correct remaining quantity (210)!");
        } else {
            console.log("FAILED: New batch quantity is incorrect.", newBatch);
        }

        // 5. Test another edge case: smaller GRN than negative batch
        console.log("--- Edge Case 2: GRN smaller than negative batch ---");
        const bRes2 = await client.query(`
            INSERT INTO inventory_batches (
                product_id, batch_code, mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate, 
                quantity_initial, quantity_remaining, is_active, status
            ) VALUES (
                $1, 'TEST_TRANSIT_BIG', $2, 100, 110, 115, 120, 130, 
                0, -100, false, 'Good'
            ) RETURNING id
        `, [productId, pRes.rows[0].mrp]);
        const oldBatchId2 = bRes2.rows[0].id;
        
        const linesJson2 = JSON.stringify([{
            product_id: productId,
            ordered_qty: 40,
            accepted_qty: 40,
            rate: 105,
            discount_percent: 0,
            discount_amount: 0,
            scheme_amount: 0,
            tax_amount: 0,
            amount: 40 * 105,
            mrp: 150,
            batch_number: 'TEST_GRN_SMALL',
            expiry_date: '2027-01-01'
        }]);

        await client.query(`
            SELECT create_purchase_invoice(
                $1, 0, 'INV_TEST_SMALL', CURRENT_DATE, CURRENT_DATE, 
                $2, 0, $2, $3::jsonb
            )
        `, [vendorId, 40 * 105, linesJson2]);

        const checkRes2 = await client.query(`
            SELECT id, batch_code, quantity_remaining
            FROM inventory_batches 
            WHERE id = $1
        `, [oldBatchId2]);
        console.log("Edge case phantom batch after partial GRN:", checkRes2.rows[0]);
        if (Number(checkRes2.rows[0].quantity_remaining) === -60 && checkRes2.rows[0].batch_code === 'TEST_GRN_SMALL') {
            console.log("SUCCESS: Partial knockoff works (-100 + 40 = -60) and batch code synced.");
        }

        // ROLLBACK to keep DB clean
        await client.query('ROLLBACK');
        console.log("Test transaction rolled back successfully.");
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Test failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}
testAutoKnockoff();
