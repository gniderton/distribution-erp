const { pool } = require('./config/db');

async function run() {
    const client = await pool.connect();
    try {
        console.log("Checking for invoices with amount_paid > 0 but no allocations...");
        const res = await client.query(`
            SELECT i.id, i.invoice_number, i.customer_id, i.grand_total, i.amount_paid 
            FROM sales_invoices i
            LEFT JOIN customer_payment_allocations a ON i.id = a.invoice_id
            WHERE i.amount_paid > 0 AND a.id IS NULL
        `);
        
        if (res.rows.length === 0) {
            console.log("No inconsistencies found! All invoices with amount_paid > 0 have allocations.");
        } else {
            console.log(`Found ${res.rows.length} inconsistent invoices:`);
            console.table(res.rows);
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
run();
