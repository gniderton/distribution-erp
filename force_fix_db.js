// force_fix_db.js
const { pool } = require('./config/db');

async function fix() {
    console.log("--- FORCE FIX: Bank Statement Constraints ---");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("1. Dropping old constraints...");
        await client.query('ALTER TABLE bank_statement_entries DROP CONSTRAINT IF EXISTS check_amount_limit');
        await client.query('ALTER TABLE bank_statement_entries DROP CONSTRAINT IF EXISTS unique_bank_tx');
        await client.query('ALTER TABLE bank_statement_entries DROP CONSTRAINT IF EXISTS bank_statement_entries_amount_check');

        console.log("2. Syncing amount column with debit/credit...");
        // If amount is 0/null, use the sum, but let's be careful about unique_full_bank_tx if we change too many
        await client.query(`
            UPDATE bank_statement_entries 
            SET amount = COALESCE(NULLIF(debit_amount, 0), NULLIF(credit_amount, 0), amount, 0)
            WHERE (amount = 0 OR amount IS NULL) AND (debit_amount > 0 OR credit_amount > 0)
        `);

        console.log("3. Adding new constraint check_amount_limit...");
        await client.query(`
            ALTER TABLE bank_statement_entries 
            ADD CONSTRAINT check_amount_limit 
            CHECK (consumed_amount <= (COALESCE(debit_amount, 0) + COALESCE(credit_amount, 0) + COALESCE(amount, 0)))
        `);

        await client.query('COMMIT');
        console.log("✅ Database Fix Applied Successfully!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Fix Failed:", err.message);
    } finally {
        client.release();
        pool.end();
    }
}

fix();
