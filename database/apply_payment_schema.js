const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '056_payment_allocation_schema.sql'), 'utf8');
        await pool.query(sql);
        console.log("Payment Schema Applied Successfully.");
    } catch (e) {
        console.error("Error applying schema:", e);
    } finally {
        pool.end();
    }
}

apply();
