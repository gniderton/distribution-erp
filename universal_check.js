const { pool } = require('./config/db');

async function universalCheck() {
    const ids = [25, 27, 87, 90];
    try {
        console.log("--- UNIVERSAL TWIN AUDIT ---");
        for (const id of ids) {
            const original = await pool.query('SELECT transaction_date, amount FROM bank_statement_entries WHERE id = $1', [id]);
            if (original.rows.length > 0) {
                const { transaction_date, amount } = original.rows[0];
                const twins = await pool.query(`
                    SELECT id, particulars, debit_amount, credit_amount, amount
                    FROM bank_statement_entries 
                    WHERE transaction_date = $1 
                    AND amount = $2
                `, [transaction_date, amount]);
                
                console.log(`\nALL records for ${transaction_date} with Amount ${amount}:`);
                console.table(twins.rows);
            }
        }
    } catch (e) {
        console.error("Universal Check Failed:", e.message);
    } finally {
        pool.end();
    }
}

universalCheck();
