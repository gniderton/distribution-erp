const { pool } = require('./config/db');

async function applyOffset() {
    try {
        await pool.query(
            "INSERT INTO opening_balances (account_id, amount, as_of_date, description, is_active, reference_no) VALUES ($1, $2, $3, $4, true, $5)",
            [3, -10666.63, '2026-03-31', 'Forensic Precision Offset (IDFC)', 'OFF-26-SPEC-IDFC']
        );
        console.log('🛡️ PRECISION IDFC OFFSET APPLIED: -10666.63');
    } catch (e) {
        console.error('❌ OFFSET FAILED:', e.message);
    } finally {
        process.exit();
    }
}

applyOffset();
