
const { pool } = require('./config/db');

async function fixClearanceAccounting() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const chequeIds = [32, 41, 43, 22, 47, 54];
        
        // 1. Find Journal Entries of type CHQ_CLEAR for these cheques
        const jeRes = await client.query(`
            SELECT id, description, reference_id 
            FROM journal_entries 
            WHERE reference_type = 'CHQ_CLEAR' 
            AND reference_id = ANY($1)
        `, [chequeIds]);
        
        const jeIds = jeRes.rows.map(r => r.id);
        console.log(`Found ${jeIds.length} Clearance Journal Entries to repair.`);

        if (jeIds.length > 0) {
            // 2. Update the lines: IDFC(3) -> Axis(2)
            const result = await client.query(`
                UPDATE journal_lines 
                SET bank_account_id = 2 
                WHERE journal_entry_id = ANY($1) 
                AND bank_account_id = 3
                AND account_id = 2 -- COA 1002 (Bank Account)
            `, [jeIds]);
            console.log(`✅ Fixed ${result.rowCount} clearance accounting lines.`);
        } else {
            // Fallback: Check if they were cleared via some other JE type?
            console.log('⚠️ No CHQ_CLEAR JEs found. Investigating alternative types...');
            
            const altRes = await client.query(`
                SELECT DISTINCT je.id, je.reference_type
                FROM journal_entries je
                JOIN journal_lines jl ON je.id = jl.journal_entry_id
                WHERE jl.bank_account_id = 3
                AND jl.debit > 0
                AND je.description ~* ANY(SELECT cheque_number FROM cheques WHERE id = ANY($1))
            `, [chequeIds]);
            
            const altJeIds = altRes.rows.map(r => r.id);
            if (altJeIds.length > 0) {
                 const result = await client.query(`
                    UPDATE journal_lines 
                    SET bank_account_id = 2 
                    WHERE journal_entry_id = ANY($1) 
                    AND bank_account_id = 3
                `, [altJeIds]);
                console.log(`✅ Fixed ${result.rowCount} alternative clearance accounting lines.`);
            }
        }

        await client.query('COMMIT');
        console.log('🏁 Accounting Repair Complete.');
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Repair failed:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixClearanceAccounting();
