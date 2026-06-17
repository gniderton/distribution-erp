const { pool } = require('../config/db');

async function fixPayment58() {
    try {
        console.log('Starting DB correction for PAY-26-58 (ID 65)...');
        
        // Axis Bank ID is 2. Statement ref is AXODH15322950916.
        // IDFC Bank ID is 3.
        
        await pool.query('BEGIN');

        // 1. Update vendor_payments
        const updatePaymentRes = await pool.query(`
            UPDATE vendor_payments 
            SET bank_account_id = 2,
                transaction_ref = 'AXODH15322950916'
            WHERE id = 65 AND payment_number = 'PAY-26-58'
            RETURNING *
        `);
        console.log('Updated Payment Record:', JSON.stringify(updatePaymentRes.rows, null, 2));

        // 2. Update journal_lines
        // Journal entry ID for PAY-26-58 is 7283.
        const updateJournalRes = await pool.query(`
            UPDATE journal_lines 
            SET bank_account_id = 2 
            WHERE journal_entry_id = 7283 AND bank_account_id = 3
            RETURNING *
        `);
        console.log('Updated Journal Lines:', JSON.stringify(updateJournalRes.rows, null, 2));

        await pool.query('COMMIT');
        console.log('🎉 DB CORRECTION COMPLETED SUCCESSFULLY!');
        
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('❌ Error updating database:', e);
    } finally {
        pool.end();
    }
}

fixPayment58();
