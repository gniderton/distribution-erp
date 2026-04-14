const { pool } = require('./config/db');

async function purgeFinal() {
    try {
        const res = await pool.query("DELETE FROM opening_balances WHERE reference_no = 'OFF-26-SPEC-IDFC'");
        console.log(`🛡️ FINAL OFFSET PURGED: Removed ${res.rowCount} records.`);
    } catch (e) {
        console.error('❌ PURGE FAILED:', e.message);
    } finally {
        process.exit();
    }
}

purgeFinal();
