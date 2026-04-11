
const { pool } = require('./config/db');

async function testLedger() {
    try {
        console.log("--- Testing CASH Ledger ---");
        const resCash = await pool.query(`
            SELECT 1 as test 
            LIMIT 1
        `); // Just to check DB connection
        
        // Simulating the API logic directly for faster verification
        const start = '2026-04-01';
        const end = '2026-04-30';
        
        const fetch = async (params) => {
            const baseUrl = 'http://localhost:3001/api/finance/accounting/statement';
            // We'll simulate the logic manually against the DB to verify the SQL holds up
        };

        // Verification Query 1: Opening Balance
        const opBal = await pool.query(`
            SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as balance
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE je.transaction_date < $1 AND coa.code = 1003
        `, [start]);
        console.log(`Cash Opening Balance (Pre-${start}):`, opBal.rows[0].balance);

        // Verification Query 2: Detail
        const trans = await pool.query(`
            SELECT 
                je.transaction_date, je.description, jl.debit, jl.credit
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE je.transaction_date >= $1 AND je.transaction_date <= $2 AND coa.code = 1003
            ORDER BY je.transaction_date ASC, je.id ASC
        `, [start, end]);
        console.log(`Transactions found: ${trans.rows.length}`);
        
        // Check running balance logic
        let bal = parseFloat(opBal.rows[0].balance);
        trans.rows.forEach(r => {
            bal += parseFloat(r.debit) - parseFloat(r.credit);
            console.log(`${r.transaction_date.toISOString().split('T')[0]} | ${r.description.substring(0, 20)} | Dr: ${r.debit} | Cr: ${r.credit} | Bal: ${bal}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

testLedger();
