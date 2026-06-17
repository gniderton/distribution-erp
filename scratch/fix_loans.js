const { pool } = require('../config/db');

async function fixLoans() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Fixing Loan 15 (from 3000 to 2000)...');
        // 1. Update loans
        await client.query('UPDATE loans SET principal_amount = 2000, balance_principal = 2000 WHERE id = 15');
        // 2. Update loan_transactions
        await client.query("UPDATE loan_transactions SET amount = 2000, principal_portion = 2000 WHERE loan_id = 15 AND transaction_type = 'DISBURSEMENT'");
        // 3. Update journal_lines (Journal 4992)
        await client.query('UPDATE journal_lines SET debit = 2000 WHERE journal_entry_id = 4992 AND debit = 3000');
        await client.query('UPDATE journal_lines SET credit = 2000 WHERE journal_entry_id = 4992 AND credit = 3000');
        // 4. Update bank_statement_entries (Entry 1485)
        await client.query("UPDATE bank_statement_entries SET consumed_amount = 2000, status = 'Exhausted' WHERE id = 1485");

        console.log('Fixing Loan 16 (from 2000 to 3000)...');
        // 1. Update loans
        await client.query('UPDATE loans SET principal_amount = 3000, balance_principal = 3000 WHERE id = 16');
        // 2. Update loan_transactions
        await client.query("UPDATE loan_transactions SET amount = 3000, principal_portion = 3000 WHERE loan_id = 16 AND transaction_type = 'DISBURSEMENT'");
        // 3. Update journal_lines (Journal 4993)
        await client.query('UPDATE journal_lines SET debit = 3000 WHERE journal_entry_id = 4993 AND debit = 2000');
        await client.query('UPDATE journal_lines SET credit = 3000 WHERE journal_entry_id = 4993 AND credit = 2000');
        // 4. Update bank_statement_entries (Entry 1486)
        await client.query("UPDATE bank_statement_entries SET consumed_amount = 3000, status = 'Exhausted' WHERE id = 1486");

        await client.query('COMMIT');
        console.log('Successfully fixed loans 15 and 16.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error fixing loans:', err);
    } finally {
        client.release();
        process.exit();
    }
}

fixLoans();
