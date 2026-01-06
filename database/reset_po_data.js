const { pool } = require('../config/db');

async function resetData() {
    try {
        console.log('--- Wiping Purchase Order Data ---');

        // 1. Truncate Tables (Cascades to Lines)
        // RESTART IDENTITY resets the ID Serial back to 1
        await pool.query('TRUNCATE TABLE purchase_order_headers, purchase_order_lines RESTART IDENTITY CASCADE');
        console.log('✅ PO Tables Truncated.');

        // 2. Reset Sequence
        await pool.query("UPDATE document_sequences SET current_number = 0 WHERE document_type = 'PO'");
        console.log('✅ PO Sequence Reset to 0.');

        console.log('\nDone. The system is clean.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

resetData();
