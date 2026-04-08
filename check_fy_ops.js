const { pool } = require('./config/db');
async function checkCurrentFY() {
    try {
        const fyStart = '2026-04-01';
        
        // 1. Check Cheques Table Schema
        const chequesCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'cheques'`);
        console.log("Cheques Columns:", chequesCols.rows.map(r => r.column_name));

        // 2. Check Customer Payment Modes
        const modes = await pool.query(`SELECT DISTINCT payment_mode FROM customer_payments`);
        console.log("Payment Modes:", modes.rows.map(r => r.payment_mode));

        // 3. Simple Operation Totals (Current FY Only)
        // Cash In (Customer Payments)
        const cashIn = await pool.query(`SELECT SUM(amount) FROM customer_payments WHERE payment_mode = 'Cash' AND payment_date >= $1`, [fyStart]);
        console.log("Cash In (FY):", cashIn.rows[0].sum || 0);

        // Cash Out (Expenses/Salaries in Cash)
        // Note: I'll need to check the payment_mode column in expenses.
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkCurrentFY();
