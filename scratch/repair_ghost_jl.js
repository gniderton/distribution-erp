const { pool } = require('../config/db');

async function repair() {
    try {
        console.log("Identifying GST Account...");
        const gstAccRes = await pool.query("SELECT id FROM chart_of_accounts WHERE code = 1011");
        const gstAccId = gstAccRes.rows[0]?.id;
        
        if (!gstAccId) {
            console.error("Could not find GST account 1011");
            process.exit(1);
        }

        console.log(`Repairing ghost entries using Account ID: ${gstAccId}...`);
        const updateRes = await pool.query(`
            UPDATE journal_lines 
            SET account_id = $1 
            WHERE account_id IS NULL 
              AND journal_entry_id IN (1588, 1589, 1679, 1789, 1826, 1988, 1997)
        `, [gstAccId]);
        
        console.log(`Successfully repaired ${updateRes.rowCount} ghost entries.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

repair();
