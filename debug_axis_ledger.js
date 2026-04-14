const { pool } = require('./config/db');

async function debugAxis() {
    try {
        console.log('🕵️ AXIS CONNECTIVITY AUDIT...');
        
        // 1. Check direct bank account mapping across sources
        const sources = await pool.query(`
            SELECT source_table, COUNT(*) as total_rows 
            FROM view_unified_liquid_ledger 
            GROUP BY source_table
        `);
        console.log('📊 Total rows in Unified View per source:');
        console.table(sources.rows);

        // 2. Check how many have bank_statement_entry_id vs Axis (ID 2)
        const linkedRows = await pool.query(`
            SELECT v.source_table, COUNT(v.*) as axis_linked_rows
            FROM view_unified_liquid_ledger v
            JOIN bank_statement_entries bse ON v.bank_statement_entry_id = bse.id
            WHERE bse.bank_account_id = 2
            GROUP BY v.source_table
        `);
        console.log('🏦 Rows successfully linked to Axis Statement (ID 2):');
        console.table(linkedRows.rows);

        // 3. Test a "Vendor Payment" specifically
        const vendorCheck = await pool.query(`
            SELECT id, payment_date, amount, bank_account_id, bank_statement_entry_id 
            FROM vendor_payments 
            WHERE bank_account_id = 2 
            LIMIT 5
        `);
        console.log('💊 Sample Axis Vendor Payments:');
        console.table(vendorCheck.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

debugAxis();
