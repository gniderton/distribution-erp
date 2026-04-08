const { pool } = require('./config/db');
async function checkCOABanks() {
    try {
        const res = await pool.query(`SELECT id, name FROM chart_of_accounts WHERE name ILIKE '%Axis%' OR name ILIKE '%IDFC%'`);
        console.table(res.rows);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkCOABanks();
