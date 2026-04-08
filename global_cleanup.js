const { pool } = require('./config/db');

async function globalCleanup() {
    const brokenIds = [25, 26, 27, 28, 87, 88, 89, 90];
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        console.log("--- STARTING GLOBAL MASTER CLEANUP ---");
        
        for (const brokenId of brokenIds) {
            const r = await client.query('SELECT transaction_date, particulars, amount FROM bank_statement_entries WHERE id = $1', [brokenId]);
            if (r.rows.length === 0) continue;
            
            const { transaction_date, particulars, amount } = r.rows[0];
            
            // Search globally (Across all accounts) for any clean version
            const clean = await client.query(`
                SELECT id, bank_account_id FROM bank_statement_entries 
                WHERE id != $1 
                AND amount = $2
                AND (debit_amount = 0 OR credit_amount = 0)
                AND (
                    (DATE(transaction_date) = DATE($3))
                    OR (particulars = $4)
                    OR (ABS(EXTRACT(EPOCH FROM (transaction_date - $3))) < 86400)
                )
                LIMIT 1
            `, [brokenId, amount, transaction_date, particulars]);
            
            if (clean.rows.length > 0) {
                const cleanId = clean.rows[0].id;
                console.log(`Repointing ${brokenId} -> ${cleanId} (Global Match)`);
                
                await client.query('UPDATE internal_transfers SET from_bank_statement_entry_id = $1 WHERE from_bank_statement_entry_id = $2', [cleanId, brokenId]);
                await client.query('UPDATE internal_transfers SET to_bank_statement_entry_id = $1 WHERE to_bank_statement_entry_id = $2', [cleanId, brokenId]);
                await client.query('UPDATE expenses SET bank_statement_entry_id = $1 WHERE bank_statement_entry_id = $2', [cleanId, brokenId]);
                
                await client.query('DELETE FROM bank_statement_entries WHERE id = $1', [brokenId]);
                console.log(`  Purged ID ${brokenId}.`);
            } else {
                console.log(`No global twin found for ${brokenId}, healing instead...`);
                await client.query('UPDATE bank_statement_entries SET credit_amount = 0 WHERE id = $1', [brokenId]);
                console.log(`  Healed ID ${brokenId}.`);
            }
        }
        
        // 3. One last attempt to re-add the constraint
        await client.query('ALTER TABLE bank_statement_entries DROP CONSTRAINT IF EXISTS unique_full_bank_tx');
        await client.query('ALTER TABLE bank_statement_entries ADD CONSTRAINT unique_full_bank_tx UNIQUE (transaction_date, particulars, debit_amount, credit_amount)');
        console.log("Global shields restored.");

        await client.query('COMMIT');
        console.log("--- GLOBAL CLEANUP COMPLETED ---");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Cleanup Failed:", e.message);
    } finally {
        client.release();
        pool.end();
    }
}

globalCleanup();
