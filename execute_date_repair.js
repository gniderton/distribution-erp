
const { pool } = require('./config/db');

async function repairDates() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const jeIds = [541, 542, 543, 544, 545, 546, 564, 565];
        const newDate = '2026-04-06';

        // 1. Update Journal Entries
        const jeUpdate = await client.query(`
            UPDATE journal_entries 
            SET transaction_date = $1 
            WHERE id = ANY($2)
        `, [newDate, jeIds]);
        console.log(`Updated ${jeUpdate.rowCount} Journal Entries to ${newDate}.`);

        // 2. Update linked Cheques
        const chqUpdate = await client.query(`
            UPDATE cheques 
            SET clearance_date = $1 
            WHERE id IN (
                SELECT reference_id 
                FROM journal_entries 
                WHERE id = ANY($2) AND reference_type = 'CHQ_CLEAR'
            )
        `, [newDate, jeIds]);
        console.log(`Updated clearance_date for ${chqUpdate.rowCount} Cheque records.`);

        await client.query('COMMIT');
        console.log('✅ Date repair successful! Transactions moved to April 6th.');
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Date repair failed:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

repairDates();
