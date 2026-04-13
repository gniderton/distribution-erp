const { pool } = require('./config/db');
async function run() {
    try {
        console.log('🏗️ Building Bank Ledger Accounts...');
        const res = await pool.query(`
            INSERT INTO chart_of_accounts (name, code, type) 
            VALUES 
            ('Axis Bank (9157)', '1102', 'ASSET'), 
            ('IDFC First Bank (0706)', '1103', 'ASSET') 
            RETURNING id, name;
        `);
        console.table(res.rows);
    } catch(e) {
        // If they already exist, just fetch them
        const existing = await pool.query("SELECT id, name FROM chart_of_accounts WHERE name ILIKE '%Axis Bank (9157)%' OR name ILIKE '%IDFC First Bank (0706)%'");
        console.log('Existing Accounts found:');
        console.table(existing.rows);
    } finally {
        process.exit();
    }
}
run();
