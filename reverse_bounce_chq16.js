const { pool } = require('./config/db');

async function reverseBouncedCheque() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const CHEQUE_ID = 16;
        const CHEQUE_NUMBER = '001223';

        console.log(`Reversing bounce for Cheque ${CHEQUE_NUMBER} (ID: ${CHEQUE_ID})...`);

        // 1. Find any journal entries created by the bounce (matched by reference_id=cheque.id and description pattern)
        const jeRes = await client.query(`
            SELECT id, reference_type, description
            FROM journal_entries
            WHERE reference_id = $1
              AND (description ILIKE '%Bounce%' OR description ILIKE '%CHQ_BOUNCE%')
        `, [CHEQUE_ID]);

        console.log(`Found ${jeRes.rows.length} bounce journal entries to delete.`);
        if (jeRes.rows.length > 0) {
            console.table(jeRes.rows);
        }

        // 2. Delete journal lines first (FK constraint), then journal entries
        for (const je of jeRes.rows) {
            await client.query(`DELETE FROM journal_lines WHERE journal_entry_id = $1`, [je.id]);
            await client.query(`DELETE FROM journal_entries WHERE id = $1`, [je.id]);
            console.log(`  ✓ Deleted journal entry ID ${je.id}: ${je.description}`);
        }

        // 3. Reset the cheque back to PENDING
        await client.query(`
            UPDATE cheques 
            SET status = 'PENDING', 
                remarks = NULL, 
                bounce_date = NULL,
                updated_at = NOW()
            WHERE id = $1
        `, [CHEQUE_ID]);

        console.log(`  ✓ Cheque ${CHEQUE_NUMBER} status reset to PENDING`);

        await client.query('COMMIT');
        console.log('\n✅ Bounce reversal completed successfully.');
        console.log('   - Cheque 001223 is now PENDING again');
        console.log('   - GL journal entries from bounce have been removed');
        console.log('   - Customer 369 ledger will no longer show the bounce debit');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Reversal failed:', err.message);
    } finally {
        client.release();
        process.exit();
    }
}

reverseBouncedCheque();
