const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sqlPath = path.join(__dirname, '053_add_route_day.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        console.log("✅ Route Day Schema Applied");
    } catch (err) {
        console.error("❌ Schema Failed:", err);
    } finally {
        pool.end();
    }
}

apply();
