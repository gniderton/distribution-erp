
const { pool } = require('./config/db');

async function repairAccounting() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const bseIds = [214, 221, 222, 223, 224, 225];
        
        // 1. Get the Journal Entry IDs for these Bank Statement Entries
        const jeRes = await client.query(`
            SELECT id, journal_entry_id 
            FROM bank_statement_entries 
            WHERE id = ANY($1)
        `, [bseIds]);
        
        const jeIds = jeRes.rows.map(r => r.journal_entry_id).filter(id => id !== null);
        console.log(`Targeting ${jeIds.length} Journal Entries associated with these bank statements.`);

        if (jeIds.length > 0) {
            // 2. Move the accounting lines from IDFC(3) to Axis(2)
            const result = await client.query(`
                UPDATE journal_lines 
                SET bank_account_id = 2 
                WHERE journal_entry_id = ANY($1) 
                AND bank_account_id = 3
            `, [jeIds]);
            console.log(`✅ Successfully moved ${result.rowCount} accounting lines from IDFC to Axis.`);
        } else {
            console.log('⚠️ No journal entries found to update.');
        }

        await client.query('COMMIT');
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to repair accounting:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

repairAccounting();
