const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function runSpecificMigration() {
    const file = 'database/082_add_mrp_to_invoice_lines.sql';
    const filePath = path.join(__dirname, file);

    try {
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`Executing: ${file}`);
        await pool.query(sql);
        console.log(`Success: ${file}`);
    } catch (err) {
        console.error('Migration Failed:', err);
    } finally {
        await pool.end();
    }
}

runSpecificMigration();
