const { pool } = require('./config/db');

async function finalHeal() {
    const ids = [27, 28, 25, 26, 87, 90];
    try {
        console.log("--- FINAL FORCE HEAL ---");
        for (const id of ids) {
            // Force reset both to 0 first, then set the correct one
            await pool.query('UPDATE bank_statement_entries SET debit_amount = 0, credit_amount = 0 WHERE id = $1', [id]);
            
            // Now set the correct debit (for these BillPay/IMPS records)
            const particulars = await pool.query('SELECT amount FROM bank_statement_entries WHERE id = $1', [id]);
            const amt = particulars.rows[0].amount;
            
            await pool.query('UPDATE bank_statement_entries SET debit_amount = $1, credit_amount = 0, amount = $1 WHERE id = $2', [amt, id]);
            
            const verify = await pool.query('SELECT id, debit_amount, credit_amount, amount FROM bank_statement_entries WHERE id = $1', [id]);
            console.log(`Verifying ID ${id}:`, verify.rows[0]);
        }
        console.log("--- FORCE HEAL COMPLETED ---");
    } catch (e) {
        console.error("Force Heal Failed:", e.message);
    } finally {
        pool.end();
    }
}

finalHeal();
