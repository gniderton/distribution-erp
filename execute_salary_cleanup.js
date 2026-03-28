const { pool } = require('./config/db');

async function cleanup() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Fixing Journal Descriptions...');
        const descRes = await client.query(`
            UPDATE journal_entries je
            SET description = REPLACE(je.description, 'undefined', s.employee_id::text)
            FROM employee_salaries s
            WHERE je.reference_id = s.id 
              AND je.reference_type = 'SALARY_PAYMENT'
              AND je.description LIKE '%undefined%'
            RETURNING je.id
        `);
        console.log(`Updated ${descRes.rows.length} descriptions.`);

        console.log('2. Reassigning Account IDs (526->8066, 527->8067)...');
        // 526: Fuel -> 8066: Salary Expense
        // 527: Food -> 8067: Salary Deductions
        const lineRes = await client.query(`
            UPDATE journal_lines jl
            SET account_id = CASE WHEN account_id = 526 THEN 8066 ELSE 8067 END
            FROM journal_entries je
            WHERE jl.journal_entry_id = je.id
              AND je.reference_type = 'SALARY_PAYMENT'
              AND jl.account_id IN (526, 527)
            RETURNING jl.id
        `);
        console.log(`Updated ${lineRes.rows.length} journal lines.`);

        await client.query('COMMIT');
        console.log('Cleanup completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Cleanup failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

cleanup();
