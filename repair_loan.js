const { pool } = require('./config/db');

async function repair() {
    try {
        await pool.query('BEGIN');
        
        // 1. Link the loan transaction to the bank statement
        const loanRes = await pool.query(
            "UPDATE loan_transactions SET bank_statement_entry_id = 251 WHERE id = 12"
        );
        console.log(`🛡️ Loan Transaction 12 Linked: ${loanRes.rowCount} record updated.`);

        // 2. Mark the bank statement as exhausted
        const bankRes = await pool.query(
            "UPDATE bank_statement_entries SET status = 'Exhausted' WHERE id = 251"
        );
        console.log(`🛡️ Bank Statement Entry 251 Exhausted: ${bankRes.rowCount} record updated.`);

        await pool.query('COMMIT');
        console.log('\n✨ FORENSIC RECONCILIATION COMPLETE!');

    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('❌ REPAIR FAILED:', e.message);
    } finally {
        process.exit();
    }
}

repair();
