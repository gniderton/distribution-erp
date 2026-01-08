const { pool } = require('../config/db');

async function checkUpdates() {
    try {
        console.log('--- Checking for POs updated via Retool ---');

        // Find the most recent PO with the specific remark
        const headerRes = await pool.query(`
            SELECT ph.*, v.vendor_name 
            FROM purchase_order_headers ph
            LEFT JOIN vendors v ON ph.vendor_id = v.id
            WHERE ph.remarks = 'Updated via Retool Manager'
            ORDER BY ph.id DESC
            LIMIT 1
        `);

        if (headerRes.rows.length === 0) {
            console.log('No POs found with remark "Updated via Retool Manager". Maybe the update failed silently/rolled back?');
            return;
        }

        const po = headerRes.rows[0];
        console.log(`\n✅ Found Updated PO: ${po.po_number} (ID: ${po.id})`);
        console.log(`   Vendor: ${po.vendor_name}`);
        console.log(`   Total: ${po.grand_total}`);
        console.log(`   Remarks: ${po.remarks}`);

        // Get Lines
        const linesRes = await pool.query(`
            SELECT pl.*, p.product_name 
            FROM purchase_order_lines pl
            LEFT JOIN products p ON pl.product_id = p.id
            WHERE pl.purchase_order_header_id = $1
        `, [po.id]);

        console.log('\n   Updated Lines:');
        console.table(linesRes.rows.map(l => ({
            Product: l.product_name,
            Qty: l.ordered_qty,
            Rate: l.rate,
            Total: l.amount
        })));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkUpdates();
