const { pool } = require('./config/db');
async function check() {
    try {
        const res = await pool.query(`
            SELECT jl.id, je.description, jl.debit, jl.credit 
            FROM journal_lines jl 
            JOIN journal_entries je ON jl.journal_entry_id = je.id 
            WHERE jl.account_id = 2 AND jl.bank_account_id IS NULL
            ORDER BY je.transaction_date DESC
            LIMIT 100
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
