const { pool } = require('./config/db');

async function findTwins() {
    const ids = [27, 28, 25, 26, 87, 90];
    try {
        console.log("--- SEARCHING FOR CLEAN TWINS ---");
        for (const id of ids) {
            const original = await pool.query('SELECT transaction_date, particulars, amount FROM bank_statement_entries WHERE id = $1', [id]);
            if (original.rows.length > 0) {
                const { transaction_date, particulars, amount } = original.rows[0];
                const twins = await pool.query(`
                    SELECT id, debit_amount, credit_amount, amount
                    FROM bank_statement_entries 
                    WHERE transaction_date = $1 
                    AND particulars = $2 
                    AND amount = $3
                    AND id != $4
                `, [transaction_date, particulars, amount, id]);
                
                console.log(`ID ${id} (${amount}) has ${twins.rows.length} twin(s):`);
                console.table(twins.rows);
            }
        }
    } catch (e) {
        console.error("Search Failed:", e.message);
    } finally {
        pool.end();
    }
}

findTwins();
