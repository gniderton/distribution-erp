const { pool } = require('./config/db');

async function findExactConflicts() {
    const brokenIds = [25, 26, 27, 28, 87, 88, 89, 90];
    try {
        console.log("--- BRUTE FORCE CONFLICT AUDIT ---");
        for (const id of brokenIds) {
            const r = await pool.query('SELECT particulars, amount, debit_amount, credit_amount, bank_account_id FROM bank_statement_entries WHERE id = $1', [id]);
            if (r.rows.length === 0) continue;
            const { amount, bank_account_id } = r.rows[0];
            
            // Search for ANY row with the same amount in the same account, regardless of date/particulars
            const conflicts = await pool.query(`
                SELECT id, transaction_date, particulars, debit_amount, credit_amount, amount
                FROM bank_statement_entries 
                WHERE bank_account_id = $1 AND amount = $2 AND id != $3
            `, [bank_account_id, amount, id]);
            
            console.log(`\nPotential Conflicts for ID ${id} (Amt: ${amount}):`);
            if (conflicts.rows.length > 0) console.table(conflicts.rows);
            else console.log("No conflicts found by amount.");
        }
    } catch (e) {
        console.error("Audit Failed:", e.message);
    } finally {
        pool.end();
    }
}

findExactConflicts();
