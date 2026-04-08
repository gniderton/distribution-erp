const { pool } = require('./config/db');

async function findDuplicates() {
    try {
        const r = await pool.query(`
            SELECT transaction_date, particulars, debit_amount, credit_amount, 
                   count(*), 
                   array_agg(id ORDER BY id) as ids
            FROM bank_statement_entries 
            GROUP BY transaction_date, particulars, debit_amount, credit_amount 
            HAVING count(*) > 1
        `);
        console.log("--- ALL DUPLICATE SETS ---");
        console.table(r.rows);
    } catch (e) {
        console.error("Search Failed:", e.message);
    } finally {
        pool.end();
    }
}

findDuplicates();
