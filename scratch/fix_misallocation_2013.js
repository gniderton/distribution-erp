const { pool } = require('../config/db');

async function fix() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🚀 Starting Transaction for Misallocation Fix (v2)...');

        // 1. Update the Allocation Record
        console.log('Updating Allocation 2221 to point to Invoice 917...');
        await client.query(`
            UPDATE customer_payment_allocations 
            SET invoice_id = 917, allocated_at = NOW() 
            WHERE id = 2221
        `);

        // 2. Revert Wrong Invoice 1316 (Subtract 246 from paid_amount)
        console.log('Reverting incorrectly applied payment from Invoice 1316...');
        await client.query(`
            UPDATE sales_invoices 
            SET 
                paid_amount = paid_amount - 246.00,
                status = 'Partially Paid'
            WHERE id = 1316
        `);

        // 3. Apply to Correct Invoice 917 (Add 246 to paid_amount)
        console.log('Applying payment to Invoice 917 and marking as Paid...');
        await client.query(`
            UPDATE sales_invoices 
            SET 
                paid_amount = paid_amount + 246.00,
                status = 'Paid'
            WHERE id = 917
        `);

        await client.query('COMMIT');
        console.log('✅ Transaction Committed Successfully. Ledger Restored.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Transaction Failed. Rolled back.', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fix();
