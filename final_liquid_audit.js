const { pool } = require('./config/db');

async function finalAudit() {
    try {
        const res = await pool.query("SELECT liquid_account_id, SUM(amount_in - amount_out) as final_balance FROM view_unified_liquid_ledger GROUP BY liquid_account_id");
        console.log('🛡️ FINAL FORENSIC BALANCES:');
        console.table(res.rows);
    } catch (e) {
        console.error('❌ DB AUDIT FAILED:', e.message);
    } finally {
        process.exit();
    }
}

finalAudit();
