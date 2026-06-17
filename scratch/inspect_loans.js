const { pool } = require('../config/db');

async function inspectLoans() {
    try {
        console.log('--- Inspecting Loans 15 and 16 ---');
        const loans = await pool.query('SELECT * FROM loans WHERE id IN (15, 16)');
        console.table(loans.rows);

        console.log('--- Inspecting Loan Transactions for Loans 15 and 16 ---');
        const transactions = await pool.query('SELECT * FROM loan_transactions WHERE loan_id IN (15, 16)');
        console.table(transactions.rows);

        const bankEntryIds = transactions.rows.map(t => t.bank_statement_entry_id).filter(id => id);
        if (bankEntryIds.length > 0) {
            console.log('--- Inspecting Related Bank Statement Entries ---');
            const bankEntries = await pool.query(`SELECT * FROM bank_statement_entries WHERE id IN (${bankEntryIds.join(',')})`);
            console.table(bankEntries.rows);
        }

        // Also check if there are transactions with IDs 15 and 16 just in case
        const transById = await pool.query('SELECT * FROM loan_transactions WHERE id IN (15, 16)');
        if (transById.rows.length > 0) {
            console.log('--- Inspecting Loan Transactions with IDs 15 and 16 ---');
            console.table(transById.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspectLoans();
