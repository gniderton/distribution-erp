const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '055_schemes_schema.sql'), 'utf8');
        await pool.query(sql);
        console.log("Schemes Schema Applied Successfully.");
    } catch (e) {
        console.error("Error applying schema:", e);
    } finally {
        pool.end();
    }
}

apply();
