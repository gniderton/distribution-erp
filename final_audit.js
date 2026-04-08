const { pool } = require('./config/db');

async function finalAudit() {
    try {
        const r = await pool.query('SELECT count(*) FROM bank_statement_entries WHERE debit_amount > 0 AND credit_amount > 0');
        console.log(`--- FINAL AUDIT ---`);
        console.log(`Total remaining double-counting rows: ${r.rows[0].count}`);
        
        if (parseInt(r.rows[0].count) === 0) {
            console.log("SUCCESS: Database is clean and high-integrity.");
        } else {
            console.log("WARNING: Some broken rows still exist.");
            const sample = await pool.query('SELECT id, particulars FROM bank_statement_entries WHERE debit_amount > 0 AND credit_amount > 0 LIMIT 5');
            console.table(sample.rows);
        }
    } catch (e) {
        console.error("Audit Failed:", e.message);
    } finally {
        pool.end();
    }
}

finalAudit();
