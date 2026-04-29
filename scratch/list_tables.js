const { pool } = require('../config/db');

async function listTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.table(res.rows);
    } finally {
        await pool.end();
    }
}

listTables();
