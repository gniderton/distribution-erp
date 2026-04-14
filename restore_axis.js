const { pool } = require('./config/db');

async function restoreAxis() {
    try {
        const res = await pool.query("DELETE FROM opening_balances WHERE reference_no LIKE 'OFF-26-%-2'");
        console.log(`🛡️ AXIS RESTORATION COMPLETE: Removed ${res.rowCount} offset records.`);
    } catch (e) {
        console.error('❌ RESTORATION FAILED:', e.message);
    } finally {
        process.exit();
    }
}

restoreAxis();
