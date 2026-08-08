const { pool } = require('./config/db');

async function run() {
    try {
        const client = await pool.connect();
        
        const allocRes = await client.query("SELECT * FROM customer_payment_allocations WHERE invoice_id = 876 AND status = 'ACTIVE'");
        console.log("Allocations:");
        console.table(allocRes.rows);
        
        const utilRes = await client.query("SELECT * FROM advance_utilizations WHERE invoice_id = 876");
        console.log("Advance Utilizations:");
        console.table(utilRes.rows);
        
        // Also check if there's any unallocated payment balance for this customer
        const unallocRes = await client.query(`
            SELECT id, payment_mode, transaction_ref, amount, balance 
            FROM customer_payments 
            WHERE customer_id = 278 AND balance > 0
        `);
        console.log("Unallocated Payments:");
        console.table(unallocRes.rows);

        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
