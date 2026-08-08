const { pool } = require('./config/db');

async function run() {
    try {
        const client = await pool.connect();
        
        // Find the bank statement entry
        const stmtRes = await client.query(`
            SELECT id, particulars, amount, consumed_amount, status, credit_amount 
            FROM bank_statement_entries 
            WHERE particulars ILIKE '%310828073890%'
            OR credit_amount = 951.00
        `);
        console.log("Bank Statement Entries:");
        console.table(stmtRes.rows);

        // Find the payment for Magic Bakes (951.00)
        const payRes = await client.query(`
            SELECT p.id, p.amount, p.transaction_ref, p.status, p.verification_status, p.bank_statement_entry_id, c.customer_name 
            FROM customer_payments p
            JOIN customers c ON p.customer_id = c.id
            WHERE p.amount = 951.00 OR p.transaction_ref ILIKE '%310828073890%'
        `);
        console.log("Payments:");
        console.table(payRes.rows);

        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
