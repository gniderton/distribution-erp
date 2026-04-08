const fs = require('fs');
const { pool } = require('../config/db');

async function dumpViews() {
    try {
        const custRes = await pool.query("SELECT pg_get_viewdef('view_customer_ledger') as def");
        fs.writeFileSync('tmp/view_customer_ledger.sql', custRes.rows[0].def);

        const vendRes = await pool.query("SELECT pg_get_viewdef('view_vendor_ledger') as def");
        fs.writeFileSync('tmp/view_vendor_ledger.sql', vendRes.rows[0].def);

        console.log("Views dumped to tmp/");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

dumpViews();
