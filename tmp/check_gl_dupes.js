const { pool } = require('../config/db');

async function checkGL() {
    try {
        const res = await pool.query(`
            SELECT reference_id, COUNT(*) as entry_count, SUM(amount) as total_amount
            FROM (
                SELECT je.reference_id, SUM(jl.debit) as amount
                FROM journal_entries je
                JOIN journal_lines jl ON je.id = jl.journal_entry_id
                WHERE je.reference_type = 'CUST_PAY'
                  AND jl.debit > 0
                GROUP BY je.id, je.reference_id
            ) sub
            GROUP BY reference_id
            HAVING COUNT(*) > 1
        `);
        
        console.log("Duplicate Journal Entries Found:");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkGL();
