const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function applyMigration() {
    try {
        const sqlPath = path.join(__dirname, 'database', '158_create_loan_entities_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log("Running SQL Migration...");
        await pool.query(sql);
        console.log("✅ Loan Entities Schema Applied Successfully!");
        
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
}

applyMigration();
