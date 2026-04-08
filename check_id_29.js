const { pool } = require('./config/db');

async function check() {
    try {
        const id = 29;
        const r1 = await pool.query('SELECT transaction_date, particulars, amount, debit_amount, credit_amount FROM bank_statement_entries WHERE id = $1', [id]);
        if (r1.rows.length === 0) {
            console.log("ID 29 not found. It might have been purged.");
            return;
        }
        
        const row = r1.rows[0];
        console.log("Current state of ID 29:");
        console.table(r1.rows);
        
        // Check for ANY twins (same date, narration, amount)
        const twins = await pool.query(`
            SELECT id, debit_amount, credit_amount, amount 
            FROM bank_statement_entries 
            WHERE transaction_date = $1 
            AND particulars = $2 
            AND amount = $3 
            AND id != $4
        `, [row.transaction_date, row.particulars, row.amount, id]);
        
        if (twins.rows.length > 0) {
            console.log("Twins found for ID 29:");
            console.table(twins.rows);
        } else {
            console.log("No twins found for ID 29.");
        }
        
    } catch (e) {
        console.error("Check Failed:", e.message);
    } finally {
        pool.end();
    }
}

check();
