const { pool } = require('./config/db');

async function audit() {
    try {
        console.log('--- AXIS BANK (ID 2) SOURCE ---');
        const axis = await pool.query("SELECT amount, description, as_of_date FROM opening_balances WHERE account_id = 2 AND is_active = true");
        console.table(axis.rows);

        console.log('\n--- IDFC BANK (ID 3) SOURCE ---');
        const idfc = await pool.query("SELECT amount, description, as_of_date FROM opening_balances WHERE account_id = 3 AND is_active = true");
        console.table(idfc.rows);

        console.log('\n--- CASH (ID 1) MARCH COLLECTIONS ---');
        const cash = await pool.query("SELECT payment_date, amount, id FROM customer_payments WHERE (bank_id = 1 OR bank_id IS NULL) AND payment_date < '2026-04-01' AND is_active = true ORDER BY payment_date ASC");
        console.table(cash.rows);
        
        const totalCash = cash.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        console.log('Total March Cash Collections:', totalCash.toFixed(2));

        console.log('\n--- DSE EXPENSES (MARCH) ---');
        const dse = await pool.query("SELECT expense_date, amount, description FROM dse_expenses WHERE expense_date < '2026-04-01' AND status = 'Verified'");
        console.table(dse.rows);
        const totalDSE = dse.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        console.log('Total March DSE Expenses:', totalDSE.toFixed(2));

    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}

audit();
