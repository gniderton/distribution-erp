const { pool } = require('./config/db');

async function finalHeal() {
    const brokenDebits = [25, 26, 28, 87, 89, 90];
    const brokenCredits = [88];
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        console.log("--- FINAL SURGICAL HEAL ---");
        
        for (const id of brokenDebits) {
            const r = await client.query('UPDATE bank_statement_entries SET credit_amount = 0, amount = debit_amount WHERE id = $1', [id]);
            console.log(`Updated ID ${id}: ${r.rowCount} row(s)`);
        }
        
        for (const id of brokenCredits) {
            const r = await client.query('UPDATE bank_statement_entries SET debit_amount = 0, amount = credit_amount WHERE id = $1', [id]);
            console.log(`Updated ID ${id}: ${r.rowCount} row(s)`);
        }
        
        await client.query('COMMIT');
        console.log("--- FINAL HEAL COMPLETED ---");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Heal Failed:", e.message);
    } finally {
        client.release();
        pool.end();
    }
}

finalHeal();
