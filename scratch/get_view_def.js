require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function getDef() {
    try {
        const res = await pool.query("SELECT pg_get_viewdef('view_unified_liquid_ledger', true) as def");
        console.log("--- VIEW DEFINITION: view_unified_liquid_ledger ---");
        console.log(res.rows[0].def);
    } catch (e) {
        console.error("Failed to get view definition:", e.message);
    } finally {
        await pool.end();
    }
}

getDef();
