const { pool } = require('../config/db');

async function check() {
    const res1 = await pool.query('SELECT COUNT(*) FROM opening_balances');
    const res2 = await pool.query('SELECT COUNT(*) FROM opening_balances WHERE journal_entry_id IS NULL');
    const res3 = await pool.query('SELECT SUM(amount) FROM opening_balances');
    
    console.log("Opening Balances Count:", res1.rows[0].count);
    console.log("Opening Balances without JE:", res2.rows[0].count);
    console.log("Total Opening Amount:", res3.rows[0].sum);

    const res32 = await pool.query(`
        SELECT SUM(quantity_remaining * purchase_rate) as missing_value 
        FROM inventory_batches 
        WHERE source_type IS NULL OR source_type = ''
    `);
    console.log("Value of Untagged Batches (Remaining):", res32.rows[0].missing_value);
    
    const res33 = await pool.query(`
        SELECT SUM(quantity_initial * purchase_rate) as initial_missing 
        FROM inventory_batches 
        WHERE source_type IS NULL OR source_type = ''
    `);
    console.log("Value of Untagged Batches (Initial):", res33.rows[0].initial_missing);
    
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
