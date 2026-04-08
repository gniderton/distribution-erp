const { pool } = require('./config/db');

async function findAll() {
    const amounts = [11004.47, 18960.00, 1697.00, 3808.44, 936.00, 945.00];
    try {
        console.log("--- FINDING ALL INSTANCES BY AMOUNT ---");
        for (const amt of amounts) {
            const r = await pool.query(`
                SELECT id, transaction_date, particulars, debit_amount, credit_amount, amount
                FROM bank_statement_entries 
                WHERE amount = $1 OR debit_amount = $1 OR credit_amount = $1
                ORDER BY transaction_date
            `, [amt]);
            
            console.log(`\nALL instances of ${amt}:`);
            console.table(r.rows);
        }
    } catch (e) {
        console.error("Search Failed:", e.message);
    } finally {
        pool.end();
    }
}

findAll();
