const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
    console.error("Usage: node run_sql.js <path_to_sql_file>");
    process.exit(1);
}

const sql = fs.readFileSync(path.resolve(filePath), 'utf8');

pool.query(sql)
    .then(() => {
        console.log(`Executed: ${filePath}`);
        process.exit(0);
    })
    .catch(err => {
        console.error("Error executing SQL:", err);
        process.exit(1);
    });
