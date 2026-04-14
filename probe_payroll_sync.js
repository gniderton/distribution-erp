const { pool } = require('./config/db');

async function probePayrollSync() {
    try {
        console.log('🕵️ PROBING PAYROLL & BONUS LOGIC...');
        
        const tables = ['employee_bonuses', 'employee_salaries', 'employee_advances'];
        for (const table of tables) {
            console.log(`\n--- ${table.toUpperCase()} ---`);
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
            `);
            console.table(res.rows);
        }

        console.log('\n🕵️ AUDITING SALARY DATA SAMPLE...');
        const salaryRes = await pool.query(`
            SELECT id, base_salary, advance_deduction, loan_deduction, net_salary, payment_mode, from_account_id 
            FROM employee_salaries 
            LIMIT 5
        `);
        console.table(salaryRes.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

probePayrollSync();
