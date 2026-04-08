const { pool } = require('./config/db');

async function purgeZombies() {
    try {
        // Find twins with aggressive narration matching (Ignore case, spaces, and non-alphanumeric)
        const r = await pool.query(`
            SELECT transaction_date, amount, count(*), 
                   array_agg(id ORDER BY id) as ids,
                   array_agg(particulars) as narrations
            FROM bank_statement_entries 
            WHERE bank_account_id = 3
            GROUP BY transaction_date, amount, LOWER(REGEXP_REPLACE(particulars, '[^a-zA-Z0-9]', '', 'g'))
            HAVING count(*) > 1
        `);
        
        console.log(`--- FOUND ${r.rows.length} AGGRESSIVE DUPLICATE SETS ---`);
        
        for (const row of r.rows) {
            const ids = row.ids;
            console.log(`Checking Aggressive Set: [${ids}] for ${row.narrations[0].substring(0, 30)}...`);
            
            for (const id of ids) {
                const links = await pool.query(`
                    SELECT 
                        (SELECT count(*) FROM internal_transfers WHERE from_bank_statement_entry_id = $1 OR to_bank_statement_entry_id = $1) +
                        (SELECT count(*) FROM expenses WHERE bank_statement_entry_id = $1) +
                        (SELECT count(*) FROM other_income WHERE bank_statement_entry_id = $1)
                    as total_links
                `, [id]);
                
                const count = parseInt(links.rows[0].total_links);
                if (count === 0) {
                    console.log(`  -> ID ${id} is UNUSED (Available). PURGING...`);
                    await pool.query('DELETE FROM bank_statement_entries WHERE id = $1', [id]);
                } else {
                    console.log(`  -> ID ${id} is LINKED (Exhausted). KEEPING.`);
                }
            }
        }
    } catch (e) {
        console.error("Purge Failed:", e.message);
    } finally {
        pool.end();
    }
}

purgeZombies();
