const { pool } = require('../config/db');

async function check() {
    const res1 = await pool.query('SELECT COUNT(*) FROM opening_balances');
    const res2 = await pool.query('SELECT COUNT(*) FROM opening_balances WHERE journal_entry_id IS NULL');
    const res3 = await pool.query('SELECT SUM(amount) FROM opening_balances');
    
    console.log("Opening Balances Count:", res1.rows[0].count);
    console.log("Opening Balances without JE:", res2.rows[0].count);
    console.log("Total Opening Amount:", res3.rows[0].sum);

    const resLT = await pool.query(`
        SELECT lt.*, l.loan_number, l.party_name 
        FROM loan_transactions lt 
        JOIN loans l ON lt.loan_id = l.id 
        ORDER BY lt.transaction_date DESC
    `);
    console.log("Loan Transactions History:");
    console.table(resLT.rows);
    
    const res27 = await pool.query(`
        SELECT source_type, SUM(quantity_initial * purchase_rate) as total_initial 
        FROM inventory_batches 
        GROUP BY source_type
    `);
    console.log("Stock Value Breakdown (Initial Imported):");
    console.table(res27.rows);
    
    const res19 = await pool.query(`SELECT SUM(debit - credit) as total_imbalance FROM journal_lines`);
    console.log("Absolute Ledger Imbalance:", res19.rows[0].total_imbalance);

    const res13 = await pool.query(`
        SELECT id, description FROM journal_entries WHERE reference_type = 'MIGRATION'
    `);
    console.log("Migration JE Descriptions:");
    console.table(res13.rows);
    
    process.exit(0);
}

check();
