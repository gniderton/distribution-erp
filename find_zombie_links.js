const { pool } = require('./config/db');

async function findLinks() {
    const ids = [167, 166, 165, 164];
    try {
        const r1 = await pool.query('SELECT from_bank_statement_entry_id as id, id as t_id FROM internal_transfers WHERE from_bank_statement_entry_id = ANY($1)', [ids]);
        const r2 = await pool.query('SELECT to_bank_statement_entry_id as id, id as t_id FROM internal_transfers WHERE to_bank_statement_entry_id = ANY($1)', [ids]);
        const r3 = await pool.query('SELECT bank_statement_entry_id as id, id as exp_id FROM expenses WHERE bank_statement_entry_id = ANY($1)', [ids]);
        
        console.log("--- FOUND LINKS FOR ZOMBIES ---");
        console.table(r1.rows.concat(r2.rows).concat(r3.rows));
    } catch (e) {
        console.error("Links Search Failed:", e.message);
    } finally {
        pool.end();
    }
}

findLinks();
