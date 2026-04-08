const { pool } = require('./config/db');
async function calculateNet() {
    try {
        const fyStart = '2026-04-01';

        // 1. CASH IN (FY)
        const cashInRes = await pool.query(`SELECT SUM(amount) FROM customer_payments WHERE payment_mode = 'Cash' AND payment_date >= $1`, [fyStart]);
        const cashIn = parseFloat(cashInRes.rows[0].sum || 0);

        // 2. CASH OUT (FY)
        // Expenses from Cash (Source ID 3)
        const expCashRes = await pool.query(`SELECT SUM(grand_total) FROM expenses WHERE payment_source_id = 3 AND expense_date >= $1`, [fyStart]);
        const expCash = parseFloat(expCashRes.rows[0].sum || 0);
        // Salaries in Cash
        const salCashRes = await pool.query(`SELECT SUM(net_salary) FROM employee_salaries WHERE payment_mode = 'Cash' AND payment_date >= $1`, [fyStart]);
        const salCash = parseFloat(salCashRes.rows[0].sum || 0);
        const cashOut = expCash + salCash;

        // 3. BANK IN (FY)
        // Direct Bank In (NEFT, UPI)
        const bankDirectInRes = await pool.query(`SELECT SUM(amount) FROM customer_payments WHERE payment_mode IN ('NEFT', 'UPI') AND payment_date >= $1`, [fyStart]);
        const bankDirectIn = parseFloat(bankDirectInRes.rows[0].sum || 0);
        // Cleared Cheques
        const chequesClearedRes = await pool.query(`SELECT SUM(amount) FROM cheques WHERE status = 'CLEARED' AND created_at >= $1`, [fyStart]);
        const chequesCleared = parseFloat(chequesClearedRes.rows[0].sum || 0);
        const bankIn = bankDirectIn + chequesCleared;

        // 4. BANK OUT (FY)
        // Vendor Payments (Bank)
        const vendorPayRes = await pool.query(`SELECT SUM(amount) FROM vendor_payments WHERE payment_mode != 'Cash' AND payment_date >= $1`, [fyStart]);
        const vendorOut = parseFloat(vendorPayRes.rows[0].sum || 0);
        // Bank Expenses (Non-Cash Source)
        const expBankRes = await pool.query(`SELECT SUM(grand_total) FROM expenses WHERE payment_source_id != 3 AND expense_date >= $1`, [fyStart]);
        const expBank = parseFloat(expBankRes.rows[0].sum || 0);
        // Bank Salaries
        const salBankRes = await pool.query(`SELECT SUM(net_salary) FROM employee_salaries WHERE payment_mode != 'Cash' AND payment_date >= $1`, [fyStart]);
        const salBank = parseFloat(salBankRes.rows[0].sum || 0);
        const bankOut = vendorOut + expBank + salBank;

        // 5. CHEQUES IN HAND (FY)
        const chequesHandRes = await pool.query(`SELECT SUM(amount) FROM cheques WHERE status = 'PENDING' AND created_at >= $1`, [fyStart]);
        const chequesHand = parseFloat(chequesHandRes.rows[0].sum || 0);

        console.log("Financial Check (Current FY Ops Only):");
        console.log("--------------------------------------");
        console.log(`CASH (Net FY Movement):  ₹${(cashIn - cashOut).toFixed(2)}  (In: ₹${cashIn}, Out: ₹${cashOut})`);
        console.log(`BANKS (Net FY Movement): ₹${(bankIn - bankOut).toFixed(2)}  (In: ₹${bankIn}, Out: ₹${bankOut})`);
        console.log(`CHEQUES IN HAND (FY):    ₹${chequesHand.toFixed(2)}`);
        console.log("--------------------------------------");

    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
calculateNet();
