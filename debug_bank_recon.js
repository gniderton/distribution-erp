// debug_bank_recon.js
const { pool } = require('./config/db');

async function debug() {
    console.log("--- DEBUG: Bank Statement Entries ---");
    try {
        const res = await pool.query(`
            SELECT id, particulars, amount, debit_amount, credit_amount, consumed_amount, status 
            FROM bank_statement_entries 
            ORDER BY created_at DESC LIMIT 5
        `);
        console.table(res.rows);

        const constraintRes = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'bank_statement_entries'::regclass;
        `);
        console.log("Constraints:");
        console.table(constraintRes.rows);

    } catch (err) {
        console.error("Debug Error:", err.message);
    } finally {
        pool.end();
    }
}

debug();
