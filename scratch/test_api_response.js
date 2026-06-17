const { pool } = require('../config/db');

async function testApiResponse() {
    try {
        console.log('Fetching Axis Bank unified liquid ledger for cheque 639246 entries...');
        
        // Axis Bank ID is 2
        const bankAccountId = 2;
        
        const dupRes = await pool.query(`
            SELECT transaction_date, bank_account_id, amount, debit_amount, credit_amount, COUNT(*), array_agg(id) as ids, array_agg(particulars) as particulars_list
            FROM bank_statement_entries
            GROUP BY transaction_date, bank_account_id, amount, debit_amount, credit_amount, 
                     LOWER(REGEXP_REPLACE(
                         SPLIT_PART(
                             SPLIT_PART(particulars, ' (Reconciled via', 1),
                             ' (Bounce Reversal',
                             1
                         ),
                         '[^a-zA-Z0-9]', '', 'g'
                     ))
            HAVING COUNT(*) > 1
        `);
        console.log('Duplicate Statement Entries Found:', JSON.stringify(dupRes.rows, null, 2));
        
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

testApiResponse();
