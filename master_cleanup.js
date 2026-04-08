const { pool } = require('./config/db');

async function masterCleanup() {
    const brokenIds = [25, 26, 27, 28, 87, 88, 89, 90];
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        console.log("--- STARTING MASTER CLEANUP ---");
        
        for (const brokenId of brokenIds) {
            const r = await client.query('SELECT transaction_date, particulars, amount FROM bank_statement_entries WHERE id = $1', [brokenId]);
            if (r.rows.length === 0) {
                console.log(`ID ${brokenId} not found, skipping.`);
                continue;
            }
            
            const { transaction_date, particulars, amount } = r.rows[0];
            
            // Find the "Clean Twin" (Same date, particulars, and amount, but only one side set)
            const clean = await client.query(`
                SELECT id FROM bank_statement_entries 
                WHERE id != $1 AND transaction_date = $2 AND particulars = $3 AND amount = $4
                AND (debit_amount = 0 OR credit_amount = 0)
                LIMIT 1
            `, [brokenId, transaction_date, particulars, amount]);
            
            if (clean.rows.length > 0) {
                const cleanId = clean.rows[0].id;
                console.log(`Repointing ${brokenId} -> ${cleanId}`);
                
                await client.query('UPDATE internal_transfers SET from_bank_statement_entry_id = $1 WHERE from_bank_statement_entry_id = $2', [cleanId, brokenId]);
                await client.query('UPDATE internal_transfers SET to_bank_statement_entry_id = $1 WHERE to_bank_statement_entry_id = $2', [cleanId, brokenId]);
                await client.query('UPDATE expenses SET bank_statement_entry_id = $1 WHERE bank_statement_entry_id = $2', [cleanId, brokenId]);
                await client.query('UPDATE other_income SET bank_statement_entry_id = $1 WHERE bank_statement_entry_id = $2', [cleanId, brokenId]);
                
                await client.query('DELETE FROM bank_statement_entries WHERE id = $1', [brokenId]);
            } else {
                console.log(`No twin found for ${brokenId}, healing instead...`);
                // If it's ID 88 (Credit), set debit to 0. Otherwise (ID 25-28, 87-90) it's a Debit, so set credit to 0.
                if (brokenId === 88) {
                    await client.query('UPDATE bank_statement_entries SET debit_amount = 0, amount = credit_amount WHERE id = $1', [brokenId]);
                } else {
                    await client.query('UPDATE bank_statement_entries SET credit_amount = 0, amount = debit_amount WHERE id = $1', [brokenId]);
                }
            }
        }
        
        await client.query('COMMIT');
        console.log("--- MASTER CLEANUP COMPLETED SUCCESSFULLY ---");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Cleanup Failed:", e.message);
    } finally {
        client.release();
        pool.end();
    }
}

masterCleanup();
