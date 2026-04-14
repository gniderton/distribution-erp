const { pool } = require('./config/db');

async function probeJournalLinks() {
    try {
        const tables = [
            'customer_payments', 'vendor_payments', 'expenses', 
            'other_income', 'internal_transfers', 'asset_transactions', 
            'employee_advances', 'employee_salaries', 'opening_balances'
        ];
        console.log('🕵️ PROBING JOURNAL_ENTRY_ID CONNECTIVITY...');
        
        for (const table of tables) {
            const res = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${table}' AND column_name = 'journal_entry_id'
            `);
            console.log(`${table.toUpperCase()}: ${res.rows.length > 0 ? '✅ FOUND' : '❌ MISSING'}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

probeJournalLinks();
