const { pool } = require('./config/db');

async function check() {
    const client = await pool.connect();
    try {
        const affectedEntries = await client.query(`
            SELECT je.id, je.description, s.employee_id 
            FROM journal_entries je 
            JOIN employee_salaries s ON je.reference_id = s.id 
            WHERE je.reference_type = 'SALARY_PAYMENT' 
              AND je.description LIKE '%undefined%'
        `);
        console.log('Affected Entries:', affectedEntries.rows.length);
        affectedEntries.rows.forEach(r => {
            console.log(`ID: ${r.id}, Old: "${r.description}", New: "Monthly Salary - Emp ID: ${r.employee_id} (...)"`);
        });

        const affectedLines = await client.query(`
            SELECT count(*) 
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            WHERE je.reference_type = 'SALARY_PAYMENT'
              AND jl.account_id IN (526, 527)
        `);
        console.log('Affected Lines (Fuel/Food):', affectedLines.rows[0].count);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}

check();
