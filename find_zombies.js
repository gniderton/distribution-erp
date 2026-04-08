const { pool } = require('./config/db');

async function findZombies() {
    try {
        const r = await pool.query(`
            SELECT bank_account_id, transaction_date, particulars, amount, 
                   count(*), 
                   array_agg(id) as ids, 
                   array_agg(reconciliation_status) as statuses
            FROM bank_statement_entries 
            GROUP BY bank_account_id, transaction_date, particulars, amount 
            HAVING count(*) > 1 
            ORDER BY count(*) DESC
        `);
        console.log("--- FOUND DUPLICATE TWINS ---");
        console.table(r.rows);
    } catch (e) {
        console.error("Zombies Search Failed:", e.message);
    } finally {
        pool.end();
    }
}

findZombies();
