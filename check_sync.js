const { pool } = require('./config/db');

async function checkSync() {
    try {
        console.log("Checking for recent sync data (Supabase)...");
        console.log("Current Time (DB):", (await pool.query("SELECT NOW()")).rows[0].now);

        // 1. Check Payments
        const payments = await pool.query("SELECT id, payment_number, amount, status, verification_status, created_at FROM customer_payments ORDER BY id DESC LIMIT 10");
        console.log("\n--- Recent Payments ---");
        console.table(payments.rows);

        // 2. Check Returns
        const returns = await pool.query("SELECT id, trip_id, invoice_id, product_id, qty, verification_status, created_at FROM trip_returns ORDER BY id DESC LIMIT 10");
        console.log("\n--- Recent Returns ---");
        console.table(returns.rows);

        // 3. Check Trip Status
        const trips = await pool.query("SELECT id, status, updated_at FROM delivery_trips ORDER BY id DESC LIMIT 10");
        console.log("\n--- Recent Trip Status ---");
        console.table(trips.rows);

        // 4. Check Invoice Status
        const invoices = await pool.query(`
            SELECT si.invoice_number, si.delivery_status, ti.submitted_at 
            FROM sales_invoices si 
            JOIN trip_invoices ti ON si.id = ti.invoice_id 
            WHERE ti.submitted_at IS NOT NULL
            ORDER BY ti.submitted_at DESC LIMIT 10
        `);
        console.log("\n--- Recent Invoice Delivery Updates ---");
        console.table(invoices.rows);

        // 5. Check Expenses
        const expenses = await pool.query("SELECT id, dse_id, expense_type, amount, status, created_at FROM dse_expenses ORDER BY id DESC LIMIT 5");
        console.log("\n--- Recent Expenses ---");
        console.table(expenses.rows);

    } catch (err) {
        console.error("Query Error:", err);
    } finally {
        pool.end();
    }
}

checkSync();
