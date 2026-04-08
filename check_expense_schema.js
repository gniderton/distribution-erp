const { pool } = require('./config/db');
async function checkExpenseSalaries() {
    try {
        const exp = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'expenses'`);
        console.log("expenses:", exp.rows.map(r => r.column_name));
        
        const sal = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'employee_salaries'`);
        console.log("employee_salaries:", sal.rows.map(r => r.column_name));

        const adj = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'stock_adjustments'`);
        console.log("stock_adjustments:", adj.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkExpenseSalaries();
