const { pool } = require('../config/db');
async function repair() {
    try {
        console.log("Starting backfill for customer_payments.bank_id...");
        const res = await pool.query(`
            UPDATE customer_payments cp 
            SET bank_id = bse.bank_account_id 
            FROM bank_statement_entries bse 
            WHERE cp.bank_statement_entry_id = bse.id 
            AND cp.bank_id IS NULL
            RETURNING cp.id
        `);
        console.log(`✅ Successfully backfilled ${res.rowCount} records.`);
    } catch (err) {
        console.error("❌ Backfill Failed:", err.message);
    } finally {
        process.exit();
    }
}
repair();
