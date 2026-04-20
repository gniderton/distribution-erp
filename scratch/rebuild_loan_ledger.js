const { pool } = require('../config/db');

async function rebuildLoanLedger() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("1. Cleaning up existing Loan Journal Entries...");
        await client.query("DELETE FROM journal_entries WHERE reference_type = 'BORROWING' OR reference_type = 'LOAN_TX'");

        console.log("2. Fetching all Loan Transactions...");
        const txRes = await client.query(`
            SELECT lt.*, l.loan_number, l.party_name 
            FROM loan_transactions lt 
            JOIN loans l ON lt.loan_id = l.id 
            ORDER BY lt.transaction_date ASC
        `);

        const accBorrowings = 2101;
        const accBank = 1002; // CORRECTED: Bank Account
        const accCash = 1003; // CORRECTED: Cash in Hand
        const accMigration = 3999;

        for (const tx of txRes.rows) {
            const amount = parseFloat(tx.amount);
            const ledgerLines = [];
            
            let paymentAcc = tx.payment_mode === 'CASH' ? accCash : accBank;
            if (tx.payment_mode === 'MIGRATION') paymentAcc = accMigration;

            if (tx.transaction_type === 'DISBURSEMENT') {
                // Money comes in (Debit Bank/Cash), Liability increases (Credit Borrowings)
                ledgerLines.push({ code: paymentAcc, debit: amount, credit: 0 });
                ledgerLines.push({ code: accBorrowings, debit: 0, credit: amount });
            } else if (tx.transaction_type === 'INSTALLMENT') {
                // Liability decreases (Debit Borrowings), Money goes out (Credit Bank/Cash)
                ledgerLines.push({ code: accBorrowings, debit: amount, credit: 0 });
                ledgerLines.push({ code: paymentAcc, debit: 0, credit: amount });
            }

            if (ledgerLines.length > 0) {
                const desc = `${tx.transaction_type}: ${tx.loan_number} (${tx.party_name})`;
                await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)', [
                    tx.transaction_date, desc, 'LOAN_TX', tx.id, JSON.stringify(ledgerLines)
                ]);
            }
        }

        console.log(`Processed ${txRes.rows.length} transactions.`);
        
        await client.query('COMMIT');
        console.log("REBUILD COMPLETE.");
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
    }
}

rebuildLoanLedger();
