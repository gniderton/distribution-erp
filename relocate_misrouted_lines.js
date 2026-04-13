const { pool } = require('./config/db');

async function relocate() {
    try {
        console.log('🏗️ Starting FINAL Forensic Relocation...');
        await pool.query('BEGIN');

        // 1. Relocate Axis: Generic Bank (2) -> Axis Bank (4453)
        const axisCount = await pool.query(`
            UPDATE journal_lines 
            SET account_id = 4453 
            WHERE account_id = 2 AND journal_entry_id IN (
                SELECT id FROM journal_entries WHERE description ILIKE '%AXIS%' OR reference_type = 'INTERNAL_TRANSFER'
            )
        `);
        console.log(`✅ Relocated Axis Lines: ${axisCount.rowCount}`);

        // 2. Relocate IDFC: Cash in Hand (3) -> IDFC First Bank (4454)
        const idfcCount = await pool.query(`
            UPDATE journal_lines 
            SET account_id = 4454 
            WHERE account_id = 3 AND journal_entry_id IN (
                SELECT id FROM journal_entries WHERE description ILIKE '%IDFC%' OR reference_type = 'INTERNAL_TRANSFER'
            )
        `);
        console.log(`✅ Relocated IDFC Lines: ${idfcCount.rowCount}`);

        // 3. Relocate Cash: Inventory (1) -> Cash in Hand (3)
        const cashCount = await pool.query(`
            UPDATE journal_lines 
            SET account_id = 3 
            WHERE account_id = 1 AND journal_entry_id IN (
                SELECT id FROM journal_entries WHERE description ILIKE '%CASH%'
            )
        `);
        console.log(`✅ Relocated Cash Lines: ${cashCount.rowCount}`);

        await pool.query('COMMIT');
        console.log('🏁 HISTORY RELOCATED SUCCESSFULLY.');
    } catch(e) {
        await pool.query('ROLLBACK');
        console.error('❌ Relocation Failed:', e.message);
    } finally {
        process.exit();
    }
}

relocate();
