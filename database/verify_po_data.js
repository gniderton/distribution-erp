const { pool } = require('../config/db');

async function checkData() {
    try {
        console.log('--- Checking Recent POs ---');
        const pos = await pool.query('SELECT id, po_number, status, grand_total, created_at FROM purchase_order_headers ORDER BY created_at DESC LIMIT 5');
        console.table(pos.rows);

        console.log('\n--- Checking Document Sequence ---');
        const seq = await pool.query("SELECT * FROM document_sequences WHERE document_type = 'PO'");
        console.table(seq.rows);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkData();
