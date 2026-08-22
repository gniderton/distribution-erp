const { pool } = require('./config/db');

async function check() {
    try {
        const res = await pool.query(`
            SELECT 
                je.reference_type,
                SUM(jl.debit) as inflow,
                SUM(jl.credit) as outflow
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE coa.type = 'ASSET' AND (coa.code = 1002 OR coa.code = 1003) 
            GROUP BY je.reference_type
        `);
        console.log(res.rows);
    } catch(err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
