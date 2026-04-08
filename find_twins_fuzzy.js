const { pool } = require('./config/db');

async function findTwinsFuzzy() {
    const ids = [27, 28, 25, 26, 87, 90];
    try {
        console.log("--- SEARCHING FOR FUZZY TWINS ---");
        for (const id of ids) {
            const original = await pool.query('SELECT transaction_date, particulars, amount FROM bank_statement_entries WHERE id = $1', [id]);
            if (original.rows.length > 0) {
                const { transaction_date, particulars, amount } = original.rows[0];
                
                // Search for same date (Ignoring time), same amount, similar particulars
                const twins = await pool.query(`
                    SELECT id, debit_amount, credit_amount, amount, particulars
                    FROM bank_statement_entries 
                    WHERE id != $1
                    AND amount = $2
                    AND DATE(transaction_date) = DATE($3)
                    AND particulars ILIKE $4
                `, [id, amount, transaction_date, `%${particulars.substring(0, 20)}%`]);
                
                console.log(`ID ${id} (Amt: ${amount}) has ${twins.rows.length} fuzzy twin(s):`);
                if (twins.rows.length > 0) console.table(twins.rows);
            }
        }
    } catch (e) {
        console.error("Fuzzy Search Failed:", e.message);
    } finally {
        pool.end();
    }
}

findTwinsFuzzy();
