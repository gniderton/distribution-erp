const { pool } = require('../config/db');

async function listTables() {
    try {
        const res = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
        );
        console.log("--- Tables in 'distribution_erp' ---");
        res.rows.forEach(row => {
            console.log(`- ${row.table_name}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

listTables();
