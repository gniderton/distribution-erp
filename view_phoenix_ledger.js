const { pool } = require('./config/db');
async function view() {
    try {
        const res = await pool.query(`
            SELECT 
                je.transaction_date, 
                je.description, 
                je.reference_type, 
                coa.name as account_name, 
                jl.debit, 
                jl.credit 
            FROM journal_entries_v2 je
            JOIN journal_lines_v2 jl ON je.id = jl.journal_entry_id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            ORDER BY je.transaction_date DESC, je.id DESC
            LIMIT 20
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
view();
