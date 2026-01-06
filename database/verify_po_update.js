const { pool } = require('../config/db');

async function verifyUpdate() {
    try {
        console.log('--- Verifying Latest PO Update ---');

        // 1. Get Latest Header
        const headerRes = await pool.query(`
            SELECT id, po_number, status, total_net, grand_total, created_at 
            FROM purchase_order_headers 
            ORDER BY id DESC LIMIT 1
        `);

        if (headerRes.rows.length === 0) {
            console.log("No POs found.");
            process.exit(0);
        }

        const po = headerRes.rows[0];
        console.log(`\nPO Header: ${po.po_number} (ID: ${po.id})`);
        console.table([po]);

        // 2. Get Lines for this PO
        const linesRes = await pool.query(`
            SELECT id, product_id, ordered_qty, rate, amount, tax_amount 
            FROM purchase_order_lines 
            WHERE purchase_order_header_id = $1
        `, [po.id]);

        console.log(`\nLine Items (${linesRes.rows.length}):`);
        console.table(linesRes.rows);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

verifyUpdate();
