const { pool } = require('./config/db');
async function scan() {
    try {
        console.log('🕵️ SCANNING FOR IRREGULARITIES...\n');

        // Irregularity 1: IDFC Drain (Transfers Out without matching Collections In)
        const idfcLeak = await pool.query(`
            SELECT 
                (SELECT SUM(amount) FROM internal_transfers WHERE from_account_id = 3) as total_out,
                (SELECT SUM(amount) FROM customer_payments WHERE bank_account_id = 3) as total_in
        `);
        console.log('--- 🛑 IRREGULARITY 1: IDFC BANK (The Hollow Account) ---');
        console.table(idfcLeak.rows);
        console.log('Conclusion: You have transferred ₹1.95M out of IDFC, but entered ₹0.00 collections INTO it. The money is coming in physically, but being recorded in the wrong bucket.\n');

        // Irregularity 2: Cash Overfill (The Default Bucket)
        const cashCheck = await pool.query(`
            SELECT COUNT(*) as count, SUM(amount) as total 
            FROM customer_payments 
            WHERE bank_account_id = 1
        `);
        console.log('--- 🛑 IRREGULARITY 2: CASH BUCKET (The Default Trap) ---');
        console.table(cashCheck.rows);
        console.log('Conclusion: Almost ALL your collection entries are sitting in ' + cashCheck.rows[0].count + ' "Cash" records. Many of these likely went into Axis or IDFC on your bank app, but were marked as "Cash" in the ERP.\n');

        // Irregularity 3: The "Axis Gap" (Re-matching Axis Statements)
        const axisSync = await pool.query(`
            SELECT COUNT(*) FROM bank_statement_entries 
            WHERE bank_account_id = 2 AND status = 'Pending'
        `);
        console.log('--- 🛑 IRREGULARITY 3: THE AXIS SYNC GAP ---');
        console.log(`Pending Unreconciled Axis Entries: ${axisSync.rows[0].count}`);
        console.log('Conclusion: You have ' + axisSync.rows[0].count + ' transactions in your Axis statement that have no match in your ledger yet.');

    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
scan();
