
const { pool } = require('./config/db');

async function fixInventory98() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const batchId = 98;
        const newInitial = 33.0;
        const newRemaining = 1.0;
        const adjustmentAmount = 24.0; // Positive for the check constraint
        const reasonDetail = 'Correction of initial opening stock error (Initial 57 -> 33)';

        // 1. Update Inventory Batch 
        const updateRes = await client.query(`
            UPDATE inventory_batches 
            SET quantity_initial = $1, 
                quantity_remaining = $2
            WHERE id = $3
            RETURNING product_id, batch_code
        `, [newInitial, newRemaining, batchId]);
        
        if (updateRes.rows.length === 0) throw new Error('Batch ID 98 not found');
        const { product_id: productId, batch_code: batchCode } = updateRes.rows[0];
        console.log(`Updated Batch 98. Product ID: ${productId}. New Remaining: ${newRemaining}`);

        // 2. Insert Stock Adjustment (Audit Trail)
        // Correcting column names based on view_file and run_command
        await client.query(`
            INSERT INTO stock_adjustments (
                product_id, qty, reason, batch_code, created_at, notes
            ) VALUES ($1, $2, $3, $4, NOW(), $5)
        `, [productId, adjustmentAmount, 'Lost', batchCode, reasonDetail]);
        console.log('Recorded Stock Adjustment for audit trail.');

        await client.query('COMMIT');
        console.log('✅ Inventory correction successful!');
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Correction failed:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixInventory98();
