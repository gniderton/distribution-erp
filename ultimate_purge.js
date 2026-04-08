const { pool } = require('./config/db');

async function ultimatePurge() {
    const brokenIds = [25, 26, 27, 28, 87, 88, 89, 90];
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        console.log("--- STARTING ULTIMATE AGGRESSIVE PURGE ---");
        
        // 1. Drop constraints
        await client.query('ALTER TABLE bank_statement_entries DROP CONSTRAINT IF EXISTS unique_full_bank_tx');
        await client.query('ALTER TABLE bank_statement_entries DROP CONSTRAINT IF EXISTS bank_stmt_unique_entry');
        console.log("Dropped constraints.");
        
        // 2. Heal the Broken 8
        for (const id of brokenIds) {
            const r = await client.query('SELECT amount FROM bank_statement_entries WHERE id = $1', [id]);
            if (r.rows.length > 0) {
                const amt = r.rows[0].amount;
                await client.query('UPDATE bank_statement_entries SET debit_amount = $1, credit_amount = 0 WHERE id = $2', [amt, id]);
                console.log(`Healed ID ${id} to (${amt}, 0).`);
            }
        }
        
        // 3. Find and Purge ALL remaining duplicates based on (Date, Particulars, Debit, Credit)
        console.log("Searching for redundant duplicates...");
        const dupes = await client.query(`
            SELECT transaction_date, particulars, debit_amount, credit_amount, array_agg(id ORDER BY id) as id_list
            FROM bank_statement_entries 
            GROUP BY transaction_date, particulars, debit_amount, credit_amount 
            HAVING count(*) > 1
        `);
        
        for (const dupe of dupes.rows) {
            const ids = dupe.id_list;
            const keepId = ids[0];
            const purgeIds = ids.slice(1);
            
            console.log(`Keeping ID ${keepId}, Purging IDs: ${purgeIds.join(', ')}`);
            
            for (const purgeId of purgeIds) {
                // Repoint links before deleting
                await client.query('UPDATE internal_transfers SET from_bank_statement_entry_id = $1 WHERE from_bank_statement_entry_id = $2', [keepId, purgeId]);
                await client.query('UPDATE internal_transfers SET to_bank_statement_entry_id = $1 WHERE to_bank_statement_entry_id = $2', [keepId, purgeId]);
                await client.query('UPDATE expenses SET bank_statement_entry_id = $1 WHERE bank_statement_entry_id = $2', [keepId, purgeId]);
                
                await client.query('DELETE FROM bank_statement_entries WHERE id = $1', [purgeId]);
            }
        }
        
        // 4. Restore Shields
        await client.query('ALTER TABLE bank_statement_entries ADD CONSTRAINT unique_full_bank_tx UNIQUE (transaction_date, particulars, debit_amount, credit_amount)');
        console.log("Database shields restored.");

        await client.query('COMMIT');
        console.log("--- ULTIMATE PURGE COMPLETED SUCCESSFULLY ---");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Ultimate Purge Failed:", e.message);
    } finally {
        client.release();
        pool.end();
    }
}

ultimatePurge();
