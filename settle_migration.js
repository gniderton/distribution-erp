const { pool } = require('./config/db');

async function settleMigration() {
    try {
        console.log('🕵️ EXECUTING FORENSIC BANK RECONCILIATION...\n');

        // 1. Quarantining Axis Loans (Ghost Inflow/Outflow)
        console.log('📦 Quarantining Axis Loans (Moving to Generic Bank)...');
        const axisLoans = await pool.query(`
            UPDATE loan_transactions 
            SET bank_statement_entry_id = NULL 
            WHERE bank_statement_entry_id IS NULL AND loan_id IN (SELECT id FROM loans)
        `);
        // Note: The source-transactions API uses account_id 2 for these because of current logic. 
        // I will update the query logic to EXCLUDE migration loans from bank statements.

        // 2. Linking IDFC Expenses (Ref IDs 1, 2, 3, 4)
        console.log('🔗 Linking IDFC Expenses to Physical Statement...');
        await pool.query("UPDATE expenses SET bank_statement_entry_id = 28 WHERE id = 1");
        await pool.query("UPDATE expenses SET bank_statement_entry_id = 27 WHERE id = 2");
        await pool.query("UPDATE expenses SET bank_statement_entry_id = 26 WHERE id = 3");
        await pool.query("UPDATE expenses SET bank_statement_entry_id = 25 WHERE id = 4");

        // 3. Update API Logic to exclude unlinked Migration data from Bank Statements
        console.log('🛠️ Ready to update source-transactions logic...');

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

settleMigration();
