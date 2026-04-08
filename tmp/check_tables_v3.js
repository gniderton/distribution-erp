const { pool } = require('../config/db');

async function checkTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%allocation%'");
        console.log("Tables found:", res.rows.map(r => r.table_name));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkTables();
