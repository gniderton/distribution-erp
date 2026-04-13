const { pool } = require('./config/db');
async function check() {
    try {
        const res = await pool.query(`
            SELECT je.reference_type, COUNT(*), SUM(jl.debit - jl.credit) as total 
            FROM journal_lines_v2 jl 
            JOIN journal_entries_v2 je ON jl.journal_entry_id = je.id 
            WHERE jl.account_id = 4454 
            GROUP BY je.reference_type
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
