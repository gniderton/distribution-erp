const { pool } = require('./config/db');
async function scan() {
    try {
        console.log('🕵️ SCANNING THE PAYMENT-TO-BANK BRIDGE...');
        const res = await pool.query(`
            SELECT 
                bse.bank_name as statement_bank, 
                COUNT(cp.id) as payment_count, 
                SUM(cp.amount) as total_amount 
            FROM customer_payments cp
            JOIN bank_statement_entries bse ON cp.bank_statement_entry_id = bse.id
            WHERE cp.bank_id IS NULL
            GROUP BY bse.bank_name
        `);
        console.table(res.rows);
        
        // Also check how many have NO bank entry link at all
        const unlinked = await pool.query(`
            SELECT COUNT(*), SUM(amount) 
            FROM customer_payments 
            WHERE bank_statement_entry_id IS NULL AND bank_id IS NULL
        `);
        console.log('--- 🛑 UNLINKED PAYMENTS (No Statement Entry) ---');
        console.table(unlinked.rows);

    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
scan();
