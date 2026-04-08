const { pool } = require('./config/db');

async function findRealTwins() {
    const ids = [27, 28, 25, 26, 87, 90];
    try {
        console.log("--- SEARCHING FOR REAL CLEAN TWINS ---");
        for (const id of ids) {
            const original = await pool.query('SELECT transaction_date, particulars, debit_amount, credit_amount FROM bank_statement_entries WHERE id = $1', [id]);
            if (original.rows.length > 0) {
                const { transaction_date, particulars, debit_amount, credit_amount } = original.rows[0];
                
                // If it's currently double-counted (e.g. 18k debit AND 18k credit)
                // The CLEAN twin would have ONLY the debit OR ONLY the credit.
                const twins = await pool.query(`
                    SELECT id, debit_amount, credit_amount, amount
                    FROM bank_statement_entries 
                    WHERE id != $1
                    AND transaction_date = $2
                    AND particulars = $3
                    AND (
                        (debit_amount = $4 AND credit_amount = 0)
                        OR (credit_amount = $5 AND debit_amount = 0)
                    )
                `, [id, transaction_date, particulars, debit_amount, credit_amount]);
                
                console.log(`ID ${id} has ${twins.rows.length} clean twin(s):`);
                if (twins.rows.length > 0) console.table(twins.rows);
            }
        }
    } catch (e) {
        console.error("Search Failed:", e.message);
    } finally {
        pool.end();
    }
}

findRealTwins();
