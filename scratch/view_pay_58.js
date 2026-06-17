const { pool } = require('../config/db');

async function checkPayment() {
    try {
        console.log('Searching for payment PAY-26-58...');
        
        // 1. Find payment record
        const pRes = await pool.query("SELECT * FROM vendor_payments WHERE payment_number = 'PAY-26-58'");
        console.log('Payment Record:', JSON.stringify(pRes.rows, null, 2));

        if (pRes.rows.length > 0) {
            const paymentId = pRes.rows[0].id;
            
            // 2. Find journal entry and lines
            const jeRes = await pool.query("SELECT * FROM journal_entries WHERE reference_type = 'PURCH_PAY' AND reference_id = $1", [paymentId]);
            console.log('Journal Entry:', JSON.stringify(jeRes.rows, null, 2));
            
            if (jeRes.rows.length > 0) {
                const jeId = jeRes.rows[0].id;
                const jlRes = await pool.query("SELECT jl.*, coa.name as account_name FROM journal_lines jl JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE jl.journal_entry_id = $1", [jeId]);
                console.log('Journal Lines:', JSON.stringify(jlRes.rows, null, 2));
            }

            // 3. Fetch bank accounts
            const baRes = await pool.query("SELECT * FROM bank_accounts");
            console.log('Bank Accounts:', JSON.stringify(baRes.rows, null, 2));

            // 4. Fetch the bank statement entry 1705
            const bseRes = await pool.query("SELECT * FROM bank_statement_entries WHERE id = 1705");
            console.log('Bank Statement Entry 1705:', JSON.stringify(bseRes.rows, null, 2));
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkPayment();
