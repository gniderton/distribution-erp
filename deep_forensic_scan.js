const { pool } = require('./config/db');
async function deepAudit() {
    try {
        console.log('🕵️ Starting Deep Forensic Scan...');
        const res = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND (column_name ILIKE '%amount%' 
                 OR column_name ILIKE '%total%' 
                 OR column_name ILIKE '%tax%' 
                 OR column_name ILIKE '%debit%' 
                 OR column_name ILIKE '%credit%'
                 OR column_name ILIKE '%account_id%'
                 OR column_name ILIKE '%coa_id%'
                 OR column_name ILIKE '%balance%'
                 OR column_name ILIKE '%grand%')
            ORDER BY table_name
        `);
        
        const scan = {};
        res.rows.forEach(r => {
            if (!scan[r.table_name]) scan[r.table_name] = [];
            scan[r.table_name].push(r.column_name);
        });

        console.log('FINANCIAL_DNA|' + JSON.stringify(scan));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
deepAudit();
