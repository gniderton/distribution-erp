const { pool } = require('./config/db');

async function addColumns() {
    try {
        await pool.query(`
            ALTER TABLE debit_notes 
            ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ, 
            ADD COLUMN IF NOT EXISTS reversed_by_id BIGINT
        `);
        console.log("✅ Audit columns added to debit_notes table.");
    } catch (err) {
        console.error("Column Add Error:", err);
    } finally {
        process.exit();
    }
}

addColumns();
