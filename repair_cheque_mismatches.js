
const { pool } = require('./config/db');

async function repair() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const chequeIds = [32, 41, 43, 22, 47, 54];
        
        // 1. Get Journal Entry IDs for these 6 cheques
        const jeRes = await client.query(`
            SELECT DISTINCT je.id as journal_entry_id, c.id as cheque_id
            FROM cheques c
            JOIN journal_entries je ON c.reference_id = je.reference_id AND c.reference_type = 'CUSTOMER_PAYMENT'
            WHERE c.id = ANY($1) AND je.reference_type = 'CUST_PAY'
        `, [chequeIds]);
        
        const jeIds = jeRes.rows.map(r => r.journal_entry_id);
        console.log(`Found ${jeIds.length} associated Journal Entries for the 6 cheques.`);

        if (jeIds.length > 0) {
            // 2. Update Journal Lines: Change bank_account_id from IDFC(3) to Axis(2)
            const jlUpdate = await client.query(`
                UPDATE journal_lines 
                SET bank_account_id = 2 
                WHERE journal_entry_id = ANY($1) 
                AND bank_account_id = 3
                AND debit > 0
            `, [jeIds]);
            console.log(`Updated ${jlUpdate.rowCount} journal lines in accounting ledger.`);
        }

        // 3. Update Cheques table: Change bank_account_id from IDFC(3) to Axis(2)
        const cUpdate = await client.query(`
            UPDATE cheques 
            SET bank_account_id = 2 
            WHERE id = ANY($1) 
            AND bank_account_id = 3
        `, [chequeIds]);
        console.log(`Updated ${cUpdate.rowCount} cheque records in registry.`);

        await client.query('COMMIT');
        console.log('✅ Bulk repair successful! All 6 cheques moved to Axis Bank.');
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Repair failed:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

repair();
