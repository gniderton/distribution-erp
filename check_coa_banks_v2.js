const { pool } = require('./config/db');
async function checkCOA() {
    try {
        const res = await pool.query(`SELECT id, name, type FROM chart_of_accounts WHERE type = 'ASSET' AND (name ILIKE '%Bank%' OR name ILIKE '%Axis%' OR name ILIKE '%IDFC%')`);
        console.table(res.rows);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkCOA();
