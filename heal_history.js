const { pool } = require('./config/db');

async function healHistory() {
    const brokenDebits = [26, 27, 28, 87, 89, 90];
    const brokenCredits = [88];
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("--- STARTING HISTORICAL HEALING ---");
        
        // 1. Heal Debits (Money Out)
        for (const id of brokenDebits) {
            console.log(`Healing ID ${id}: Setting Credit to 0...`);
            await client.query(`
                UPDATE bank_statement_entries 
                SET credit_amount = 0, amount = debit_amount 
                WHERE id = $1
            `, [id]);
        }
        
        // 2. Heal Credits (Money In)
        for (const id of brokenCredits) {
            console.log(`Healing ID ${id}: Setting Debit to 0...`);
            await client.query(`
                UPDATE bank_statement_entries 
                SET debit_amount = 0, amount = credit_amount 
                WHERE id = $1
            `, [id]);
        }
        
        await client.query('COMMIT');
        console.log("--- HISTORICAL HEALING COMPLETED SUCCESSFULLY ---");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Healing Failed:", e.message);
    } finally {
        client.release();
        pool.end();
    }
}

healHistory();
