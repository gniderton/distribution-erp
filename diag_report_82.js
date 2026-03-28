const { pool } = require('./config/db');

async function diagnose() {
    const reportId = 82;
    console.log(`--- DIAGNOSING REPORT ${reportId} ---`);
    
    try {
        // 1. Check Report Summary
        const summary = await pool.query('SELECT id, settlement_status FROM daily_sales_reports WHERE id = $1', [reportId]);
        console.log('Report Status:', summary.rows[0]);

        // 2. Check ALL Payments
        const payments = await pool.query(`
            SELECT id, payment_mode, amount, verification_status 
            FROM customer_payments 
            WHERE report_id = $1
        `, [reportId]);
        console.log('--- PAYMENTS ---');
        console.table(payments.rows);

        // 3. Check ALL Expenses
        const expenses = await pool.query(`
            SELECT id, expense_type, amount, status 
            FROM dse_expenses 
            WHERE report_id = $1
        `, [reportId]);
        console.log('--- EXPENSES ---');
        console.table(expenses.rows);

        // 4. Run the Auto-Settle logic check
        const check = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM customer_payments WHERE report_id = $1 AND verification_status ILIKE 'Pending') as pending_payments,
                (SELECT COUNT(*) FROM dse_expenses WHERE report_id = $1 AND status ILIKE 'Pending') as pending_expenses
        `, [reportId]);
        console.log('--- AUTO-SETTLE CHECK ---');
        console.log(check.rows[0]);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

diagnose();
