const { pool } = require('./config/db');

async function findTwinsHardcore() {
    const ids = [25, 26, 27, 28, 87, 90];
    try {
        console.log("--- HARDCORE TWIN SEARCH ---");
        for (const id of ids) {
            const original = await pool.query('SELECT transaction_date, amount FROM bank_statement_entries WHERE id = $1', [id]);
            if (original.rows.length > 0) {
                const { transaction_date, amount } = original.rows[0];
                const twins = await pool.query(`
                    SELECT id, particulars, debit_amount, credit_amount, amount, transaction_date
                    FROM bank_statement_entries 
                    WHERE id != $1
                    AND amount = $2
                    AND DATE(transaction_date) = DATE($3)
                `, [id, amount, transaction_date]);
                
                console.log(`\nID ${id} (Amt: ${amount}, Date: ${transaction_date}) has ${twins.rows.length} hardcore twin(s):`);
                if (twins.rows.length > 0) console.table(twins.rows);
            }
        }
    } catch (e) {
        console.error("Hardcore Search Failed:", e.message);
    } finally {
        pool.end();
    }
}

findTwinsHardcore();
