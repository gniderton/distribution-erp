const { pool } = require('./config/db');
async function checkCOA() {
    try {
        const res = await pool.query(`
            SELECT id, code, name, type 
            FROM chart_of_accounts 
            WHERE name ILIKE '%Sales%' 
               OR name ILIKE '%Bank%' 
               OR name ILIKE '%Inventory%' 
               OR name ILIKE '%Receivable%' 
               OR name ILIKE '%Payable%' 
               OR name ILIKE '%Hand%'
               OR name ILIKE '%COGS%'
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkCOA();
