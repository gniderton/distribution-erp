const { pool } = require('./config/db');

async function surgicalCleanup() {
    // Map of [BrokenID, CleanID]
    const twinMap = [
        [155, 167], [156, 170], [154, 165], [157, 172],
        [151, 168], [153, 171], [142, 166], [160, 25]
    ];
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("--- STARTING SURGICAL REPOINT & PURGE ---");
        
        for (const [brokenId, cleanId] of twinMap) {
            console.log(`Processing: Repointing ${brokenId} to ${cleanId}`);
            
            // 1. Repoint Internal Transfers (From)
            await client.query('UPDATE internal_transfers SET from_bank_statement_entry_id = $1 WHERE from_bank_statement_entry_id = $2', [cleanId, brokenId]);
            // 2. Repoint Internal Transfers (To)
            await client.query('UPDATE internal_transfers SET to_bank_statement_entry_id = $1 WHERE to_bank_statement_entry_id = $2', [cleanId, brokenId]);
            // 3. Repoint Expenses
            await client.query('UPDATE expenses SET bank_statement_entry_id = $1 WHERE bank_statement_entry_id = $2', [cleanId, brokenId]);
            // 4. Repoint Other Income
            await client.query('UPDATE other_income SET bank_statement_entry_id = $1 WHERE bank_statement_entry_id = $2', [cleanId, brokenId]);
            
            // 5. Safe Delete
            const r = await client.query('DELETE FROM bank_statement_entries WHERE id = $1', [brokenId]);
            if (r.rowCount > 0) console.log(`  SUCCESS: Purged Broken ID ${brokenId}.`);
        }
        
        await client.query('COMMIT');
        console.log("--- CLEANUP COMPLETED SUCCESSFULLY ---");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("SURGICAL CLEANUP FAILED:", e.message);
    } finally {
        client.release();
        pool.end();
    }
}

surgicalCleanup();
