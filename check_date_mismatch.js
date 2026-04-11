
const { pool } = require('./config/db');

async function findMismatchedDates() {
    const jeIds = [541, 542, 543, 544, 545, 546, 564, 565];
    
    try {
        const res = await pool.query(`
            SELECT 
                je.id as journal_id, 
                je.transaction_date as accounting_date,
                je.description,
                bse.id as statement_id,
                bse.transaction_date as actual_bank_date,
                c.id as cheque_id
            FROM journal_entries je
            JOIN cheques c ON c.id = je.reference_id AND je.reference_type = 'CHQ_CLEAR'
            JOIN bank_statement_entries bse ON c.bank_statement_entry_id = bse.id
            WHERE je.id = ANY($1)
        `, [jeIds]);

        console.table(res.rows);
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

findMismatchedDates();
