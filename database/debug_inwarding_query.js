const { pool } = require('../config/db');

async function debug() {
    try {
        console.log('--- Testing Inwarding Query ---');
        const query = `
            SELECT 
                pi.id,
                pi.invoice_number,
                pi.vendor_invoice_number,
                pi.vendor_invoice_date,
                pi.received_date,
                pi.status,
                pi.grand_total,
                v.name as vendor_name,
                ph.po_number -- If linked
            FROM purchase_invoice_headers pi
            JOIN vendors v ON pi.vendor_id = v.id
            LEFT JOIN purchase_order_headers ph ON pi.purchase_order_id = ph.id
            ORDER BY pi.id DESC
        `;

        console.log('Running Query...');
        const result = await pool.query(query);
        console.log('✅ Query Successful.');
        console.log('Rows returned:', result.rows.length);
        console.table(result.rows);
        process.exit(0);

    } catch (err) {
        console.error('❌ Query Failed!');
        console.error('Message:', err.message);
        console.error('Detail:', err.detail || 'N/A');
        console.error('Hint:', err.hint || 'N/A');
        process.exit(1);
    }
}

debug();
