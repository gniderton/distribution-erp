const { pool } = require('./config/db');

async function searchExtremeShadows() {
    try {
        const tables = ['dse_settlements', 'petty_cash', 'journal_entries'];
        console.log('🕵️ SEARCHING FOR EXTREME SHADOW LIQUID PULSES...');
        
        const existingTablesRes = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_name IN ('dse_settlements', 'petty_cash', 'journal_entries')
        `);
        console.log('Existing Tables:', existingTablesRes.rows.map(r => r.table_name));

        for (const table of existingTablesRes.rows.map(r => r.table_name)) {
            console.log(`\n--- ${table.toUpperCase()} ---`);
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
            `);
            console.table(res.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

searchExtremeShadows();
