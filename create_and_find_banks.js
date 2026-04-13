const { pool } = require('./config/db');
async function create() {
    try {
        console.log('🏗️ Creating Bank Accounts in Ledger...');
        const res = await pool.query(`
            INSERT INTO chart_of_accounts (name, code, type) 
            VALUES 
            ('Axis Bank (9157)', '1004', 'Asset'), 
            ('IDFC First Bank (0706)', '1005', 'Asset') 
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id, name;
        `);
        console.table(res.rows);
        
        // If they already existed but with different IDs, find them
        if (res.rows.length === 0) {
            const existing = await pool.query("SELECT id, name FROM chart_of_accounts WHERE name ILIKE '%Axis%' OR name ILIKE '%IDFC%'");
            console.log('Using Existing Banks:');
            console.table(existing.rows);
        }
    } catch(e) {
        console.error('❌ Allocation Error:', e.message);
    } finally {
        process.exit();
    }
}
create();
