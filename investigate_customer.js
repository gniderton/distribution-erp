const { pool } = require('./config/db');

async function run() {
    try {
        const client = await pool.connect();

        // 1. Get Customer ID
        const custRes = await client.query(`SELECT id, customer_name FROM customers WHERE customer_name ILIKE '%REAL FOODS&BAKERS%' OR customer_name ILIKE '%REAL FOODS & BAKERS%' LIMIT 1`);
        if (custRes.rows.length === 0) {
            console.log("Customer not found.");
            process.exit(0);
        }
        const customerId = custRes.rows[0].id;
        console.log(`Customer ID: ${customerId}`);

        // 2. Check Invoice INV-26-0230
        const invRes = await client.query(`
            SELECT id, invoice_number, grand_total, amount_paid, paid_amount, status 
            FROM sales_invoices 
            WHERE invoice_number = 'INV-26-0230'
        `);
        console.log("Invoice Details:");
        console.table(invRes.rows);

        // 3. Check Ledger Balance
        const ledgerRes = await client.query(`
            SELECT 
                SUM(debit_amount) as total_debit, 
                SUM(credit_amount) as total_credit,
                SUM(debit_amount) - SUM(credit_amount) as net_balance
            FROM view_customer_ledger 
            WHERE customer_id = $1
        `, [customerId]);
        console.log("Ledger Summary:");
        console.table(ledgerRes.rows);

        // 4. List Ledger Entries
        const entriesRes = await client.query(`
            SELECT date, type, reference_number, debit_amount, credit_amount, status
            FROM view_customer_ledger
            WHERE customer_id = $1
            ORDER BY date DESC, id DESC
        `, [customerId]);
        console.log("Ledger Entries:");
        console.table(entriesRes.rows);

        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
