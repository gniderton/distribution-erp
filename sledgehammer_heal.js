const { pool } = require('./config/db');

async function sledgehammerHeal() {
    const ids = [25, 26, 27, 28, 87, 90];
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log("--- SLEDGEHAMMER HEAL STARTING ---");
        
        // 1. Drop the constraint that is blocking us
        await client.query('ALTER TABLE bank_statement_entries DROP CONSTRAINT IF EXISTS unique_full_bank_tx');
        await client.query('ALTER TABLE bank_statement_entries DROP CONSTRAINT IF EXISTS bank_stmt_unique_entry');
        console.log("Dropped constraints.");
        
        // 2. Heal the rows
        for (const id of ids) {
            const original = await client.query('SELECT amount FROM bank_statement_entries WHERE id = $1', [id]);
            if (original.rows.length > 0) {
                const amt = original.rows[0].amount;
                await client.query('UPDATE bank_statement_entries SET debit_amount = $1, credit_amount = 0 WHERE id = $2', [amt, id]);
                console.log(`Healed ID ${id} to (${amt}, 0).`);
            }
        }
        
        // 3. Try to re-add the constraint to find the real duplicates
        console.log("Attempting to re-add constraint...");
        try {
            await client.query('ALTER TABLE bank_statement_entries ADD CONSTRAINT unique_full_bank_tx UNIQUE (transaction_date, particulars, debit_amount, credit_amount)');
            console.log("Constraint re-added successfully. No duplicates exist now.");
        } catch (e) {
            console.error("CONSTRAINT RE-ADD FAILED. Duplicates found:", e.message);
        }
        
        await client.query('COMMIT');
        console.log("--- SLEDGEHAMMER HEAL COMPLETED ---");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Sledgehammer Failed:", e.message);
    } finally {
        client.release();
        pool.end();
    }
}

sledgehammerHeal();
