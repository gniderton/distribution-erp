const { pool } = require('./config/db');
async function backfill() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Get all loans that have no transactions
        const loansRes = await client.query(`
            SELECT id, principal_amount, balance_principal, disbursement_date, loan_number 
            FROM loans l
            WHERE NOT EXISTS (SELECT 1 FROM loan_transactions WHERE loan_id = l.id)
        `);
        
        console.log(`Found ${loansRes.rows.length} loans requiring backfill.`);

        for (const loan of loansRes.rows) {
            const principal = parseFloat(loan.principal_amount);
            const balance = parseFloat(loan.balance_principal);
            const paid = principal - balance;

            console.log(`Processing ${loan.loan_number}: Principal=${principal}, Paid=${paid}`);

            // A. Disbursement Transaction
            await client.query(`
                INSERT INTO loan_transactions (
                    loan_id, transaction_date, amount, principal_portion, interest_portion,
                    transaction_type, payment_mode, reference_no, remarks
                ) VALUES ($1, $2, $3, $4, 0, 'DISBURSEMENT', 'MIGRATION', 'MIGRATION', 'Historical Disbursement')
            `, [loan.id, loan.disbursement_date, principal, principal]);

            // B. Payment/Settlement Transaction (if any)
            if (paid > 0) {
                await client.query(`
                    INSERT INTO loan_transactions (
                        loan_id, transaction_date, amount, principal_portion, interest_portion,
                        transaction_type, payment_mode, reference_no, remarks
                    ) VALUES ($1, $2, $3, $4, 0, 'INSTALLMENT', 'MIGRATION', 'MIGRATION', 'Historical Migration Settlement')
                `, [loan.id, loan.disbursement_date, paid, paid]);
            }
        }

        await client.query('COMMIT');
        console.log("Backfill complete!");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
backfill();
