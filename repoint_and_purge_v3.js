const { pool } = require('./config/db');

async function repointAndPurge() {
    const brokenIds = [25, 26, 27, 28, 87, 88, 89, 90];
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("--- FINAL REPOINT & PURGE ---");

        for (const brokenId of brokenIds) {
            // Find the Clean Twin (Date, Particulars, Amount, and 0 side)
            const b = await client.query('SELECT transaction_date, particulars, amount FROM bank_statement_entries WHERE id = $1', [brokenId]);
            if (b.rows.length === 0) continue;
            const { transaction_date, particulars, amount } = b.rows[0];

            const clean = await client.query(`
                SELECT id FROM bank_statement_entries 
                WHERE id != $1 AND transaction_date = $2 AND particulars = $3 AND amount = $4
                AND (debit_amount = 0 OR credit_amount = 0)
                LIMIT 1
            `, [brokenId, transaction_date, particulars, amount]);

            if (clean.rows.length > 0) {
                const cleanId = clean.rows[0].id;
                console.log(`Repointing Links: Broken ID ${brokenId} -> Clean ID ${cleanId}`);

                // Repoint internal_transfers
                await client.query('UPDATE internal_transfers SET from_bank_statement_entry_id = $1 WHERE from_bank_statement_entry_id = $2', [cleanId, brokenId]);
                await client.query('UPDATE internal_transfers SET to_bank_statement_entry_id = $1 WHERE to_bank_statement_entry_id = $2', [cleanId, brokenId]);
                
                // Repoint expenses
                await client.query('UPDATE expenses SET bank_statement_entry_id = $1 WHERE bank_statement_entry_id = $2', [cleanId, brokenId]);
                
                // Repoint other_income
                await client.query('UPDATE other_income SET bank_statement_entry_id = $1 WHERE bank_statement_entry_id = $2', [cleanId, brokenId]);

                // 2. Final Purge
                await client.query('DELETE FROM bank_statement_entries WHERE id = $1', [brokenId]);
                console.log(`  SUCCESS: Purged Broken ID ${brokenId}.`);
            } else {
                console.log(`  WARNING: No Clean Twin for ID ${brokenId}. HEALING ONLY.`);
                await client.query('UPDATE bank_statement_entries SET credit_amount = 0 WHERE id = $1', [brokenId]);
            }
        }

        // 3. Final Restoration of Shields
        await client.query('ALTER TABLE bank_statement_entries ADD CONSTRAINT unique_full_bank_tx UNIQUE (transaction_date, particulars, debit_amount, credit_amount)');
        console.log("Database shields restored.");

        await client.query('COMMIT');
        console.log("--- FINAL CLEANUP COMPLETED ---");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Cleanup Failed:", e.message);
    } finally {
        client.release();
        pool.end();
    }
}

repointAndPurge();
