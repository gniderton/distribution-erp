const { pool } = require('../config/db');

async function run() {
    try {
        const res = await pool.query("SELECT definition FROM pg_views WHERE viewname = 'view_vendor_ledger'");
        console.log(res.rows[0].definition);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
