const { pool } = require('./config/db');

async function checkAccounts() {
    try {
        const res = await pool.query("SELECT id, name, code FROM accounts WHERE name ILIKE '%advance%' OR name ILIKE '%loan%' OR name ILIKE '%salary%'");
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAccounts();
