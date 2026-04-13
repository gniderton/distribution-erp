const { pool } = require('./config/db');
async function build() {
    try {
        console.log('🏗️ Building Bank Ledger Accounts...');
        
        // Let's check for the group column name again, safely
        const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'chart_of_accounts'");
        const colNames = cols.rows.map(r => r.column_name);
        
        // Systematically build the insert
        let query = "INSERT INTO chart_of_accounts (id, name, type";
        let values = "VALUES (24, 'Axis Bank (9157)', 'Asset'";
        let values2 = "(25, 'IDFC First Bank (0706)', 'Asset'";
        
        if (colNames.includes('is_system')) {
            query += ", is_system";
            values += ", true";
            values2 += ", true";
        }
        
        query += ") " + values + "), " + values2 + ") ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name";
        
        await pool.query(query);
        console.log('✅ Axis (24) and IDFC (25) created successfully.');
        
    } catch(e) {
        console.error('❌ Error building accounts:', e.message);
    } finally {
        process.exit();
    }
}
check = build();
