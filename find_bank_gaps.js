const { pool } = require('./config/db');
async function findGaps() {
    try {
        console.log('🕵️ ANALYZING BANK GAPS...');

        // 1. Check Axis Opening Balance
        const axisOpen = await pool.query("SELECT amount FROM opening_balances WHERE account_id = 24 OR account_id = 2");
        console.log('\n--- 🏧 AXIS OPENING BALANCE ---');
        console.table(axisOpen.rows);

        // 2. Check for Unconsumed IDFC Entries (Incoming Money not yet in Ledger)
        const idfcUnconsumed = await pool.query(`
            SELECT bank_name, SUM(credit_amount - consumed_amount) as unconsumed_in, COUNT(*) 
            FROM bank_statement_entries 
            WHERE bank_name ILIKE '%IDFC%' AND status != 'Exhausted'
            GROUP BY bank_name
        `);
        console.log('\n--- 🏧 IDFC UNCONSUMED (Expected IN money) ---');
        console.table(idfcUnconsumed.rows);

        // 3. Check for Unconsumed Axis Entries (Outgoing Money not yet in Ledger)
        const axisUnconsumed = await pool.query(`
            SELECT bank_name, SUM(debit_amount - consumed_amount) as unconsumed_out, COUNT(*) 
            FROM bank_statement_entries 
            WHERE bank_name ILIKE '%Axis%' AND status != 'Exhausted'
            GROUP BY bank_name
        `);
        console.log('\n--- 🏧 AXIS UNCONSUMED (Expected OUT money) ---');
        console.table(axisUnconsumed.rows);

    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
findGaps();
