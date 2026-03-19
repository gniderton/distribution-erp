const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'database/162_asset_purchase_sequence.sql'), 'utf8');
        await pool.query(sql);
        console.log("✅ Asset Sequence Migration Applied");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
}
run();
