const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sqlPath = path.join(__dirname, '049_geolocation_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        console.log("✅ Geolocation Schema Applied Successfully");
    } catch (err) {
        console.error("❌ Schema Application Failed:", err);
    } finally {
        pool.end();
    }
}

apply();
