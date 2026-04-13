const { pool } = require('./config/db');

async function reconcileLoans() {
    console.log("--- Starting Selective Forensic Loan Reconciliation ---");
    
    // 1. Fetch only Historical Bulk Import Loans
    const loansRes = await pool.query(`
        SELECT id, loan_type, principal_amount, disbursement_date 
        FROM loans 
        WHERE remarks = 'Historical Bulk Import'
    `);
    
    if (loansRes.rows.length === 0) {
        console.log("No historical loans found to reconcile.");
        process.exit(0);
    }

    // 2. Account for installments made BEFORE April 1st
    let totalAdvancesGiven = 0; // Asset 1105
    let totalDebtsTaken = 0;    // Liability 2101

    for (const loan of loansRes.rows) {
        const principal = parseFloat(loan.principal_amount);
        
        // Find installments before 2026-04-01
        const txRes = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as paid 
            FROM loan_transactions 
            WHERE loan_id = $1 AND transaction_date < '2026-04-01' AND transaction_type = 'INSTALLMENT'
        `, [loan.id]);
        
        const paidBeforeApril = parseFloat(txRes.rows[0].paid);
        const openingBalance = principal - paidBeforeApril;

        if (loan.loan_type === 'GIVEN') {
            totalAdvancesGiven += openingBalance;
        } else {
            totalDebtsTaken += openingBalance;
        }
    }

    console.log(`Calculated Opening Balances: Advances Given = ${totalAdvancesGiven}, Debts Taken = ${totalDebtsTaken}`);

    // Account IDs (1105 Advances, 2101 Borrowings, 3999 Suspense)
    const coaRes = await pool.query("SELECT id, code FROM chart_of_accounts WHERE code IN (1105, 2101, 3999)");
    const accMap = {};
    coaRes.rows.forEach(r => accMap[r.code] = r.id);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // --- Entry A: Opening Advances Given ---
        if (totalAdvancesGiven > 0) {
            const entryA = await client.query(`
                INSERT INTO journal_entries (transaction_date, description, reference_type, reference_id)
                VALUES ('2026-04-01', 'Opening Migration: Advances Given Catch-up', 'MIGRATION', '0')
                RETURNING id
            `);
            const entryIdA = entryA.rows[0].id;
            await client.query(`
                INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
                VALUES ($1, $2, $3, 0), ($1, $4, 0, $3)
            `, [entryIdA, accMap[1105], totalAdvancesGiven, accMap[3999]]);
            console.log(`SUCCESS: Created JE ${entryIdA} for Advances Given`);
        }

        // --- Entry B: Opening Debts Taken ---
        if (totalDebtsTaken > 0) {
            const entryB = await client.query(`
                INSERT INTO journal_entries (transaction_date, description, reference_type, reference_id)
                VALUES ('2026-04-01', 'Opening Migration: Borrowings Catch-up', 'MIGRATION', '0')
                RETURNING id
            `);
            const entryIdB = entryB.rows[0].id;
            await client.query(`
                INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
                VALUES ($1, $2, $3, 0), ($1, $4, 0, $3)
            `, [entryIdB, accMap[3999], totalDebtsTaken, accMap[2101]]);
            console.log(`SUCCESS: Created JE ${entryIdB} for Borrowings`);
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("FAILED to reconcile loans:", e.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

reconcileLoans();
