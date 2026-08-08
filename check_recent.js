const { pool } = require('./config/db');

async function run() {
    try {
        const client = await pool.connect();
        
        // 1. Check Invoice INV-26-2953
        const invRes = await client.query(`
            SELECT id, invoice_number, grand_total, amount_paid, paid_amount, status 
            FROM sales_invoices 
            WHERE invoice_number = 'INV-26-2953'
        `);
        console.log("Recent Invoice Details:");
        console.table(invRes.rows);

        const invId = invRes.rows[0].id;

        // 2. Check allocations for INV-26-2953
        const allocRes = await client.query(`
            SELECT * FROM customer_payment_allocations WHERE invoice_id = $1
        `, [invId]);
        console.log("Allocations for INV-26-2953:");
        console.table(allocRes.rows);

        // 3. Check advance utilizations for INV-26-2953
        const utilRes = await client.query(`
            SELECT * FROM advance_utilizations WHERE invoice_id = $1
        `, [invId]);
        console.log("Advance Utilizations for INV-26-2953:");
        console.table(utilRes.rows);
        
        // 4. Check Customer Advances state
        const advRes = await client.query("SELECT * FROM customer_advances WHERE customer_id = 278");
        console.log("Advances for customer 278:");
        console.table(advRes.rows);

        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
