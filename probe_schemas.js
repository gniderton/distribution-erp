const { pool } = require('./config/db');
async function check() {
    try {
        console.log('🕵️ PROBING SCHEMAS...');
        
        const expenses = await pool.query("SELECT * FROM expenses LIMIT 1");
        console.log('\n--- EXPENSES COLUMNS ---');
        console.log(Object.keys(expenses.rows[0] || { empty: true }).join(', '));
        
        const other = await pool.query("SELECT * FROM other_income LIMIT 1");
        console.log('\n--- OTHER INCOME COLUMNS ---');
        console.log(Object.keys(other.rows[0] || { empty: true }).join(', '));

        const loans = await pool.query("SELECT * FROM loan_transactions LIMIT 1");
        console.log('\n--- LOAN TRANS COLUMNS ---');
        console.log(Object.keys(loans.rows[0] || { empty: true }).join(', '));

    } catch(e) {
        console.error('Probing Error:', e.message);
    } finally {
        process.exit();
    }
}
check();
