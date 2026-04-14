const { pool } = require('./config/db');

async function cleanup() {
    try {
        const res = await pool.query("DELETE FROM opening_balances WHERE reference_no LIKE 'OFF-26-%'");
        console.log(`🛡️ LEDGER CLEANUP COMPLETE: Removed ${res.rowCount} forensic offsets.`);
    } catch (e) {
        console.error('❌ CLEANUP FAILED:', e.message);
    } finally {
        process.exit();
    }
}

cleanup();
