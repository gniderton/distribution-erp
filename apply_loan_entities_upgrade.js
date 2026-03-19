const { pool } = require('./config/db');

async function upgrade() {
    try {
        console.log("Applying reference_id upgrade...");
        await pool.query("ALTER TABLE loan_entities ADD COLUMN IF NOT EXISTS reference_id INT NULL");
        console.log("✅ Schema Upgraded");
        process.exit(0);
    } catch(err) {
        console.error("❌ Failed:", err);
        process.exit(1);
    }
}
upgrade();
