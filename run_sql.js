const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Please provide a file path');
        process.exit(1);
    }

    try {
        const sql = fs.readFileSync(path.resolve(filePath), 'utf8');
        await pool.query(sql);
        console.log(`✅ SQL migration ${path.basename(filePath)} applied successfully!`);
        process.exit(0);
    } catch (err) {
        console.error('❌ SQL Error:', err.message);
        process.exit(1);
    }
}

run();
