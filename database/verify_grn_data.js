const { pool } = require('../config/db');

async function verifyGRN() {
    try {
        console.log('--- Verifying Latest GRN ---');

        // 1. Get Latest Header
        const headerRes = await pool.query(`
            SELECT * FROM purchase_invoice_headers 
            ORDER BY id DESC LIMIT 1
        `);

        if (headerRes.rows.length === 0) {
            console.log('❌ No GRN found.');
            return;
        }

        const header = headerRes.rows[0];
        console.log('✅ Latest Header:', {
            id: header.id,
            invoice_no: header.invoice_number,
            vendor_bill: header.vendor_invoice_number,
            status: header.status,
            total: header.grand_total,
            po_id: header.purchase_order_id
        });

        // 2. Get Lines
        const linesRes = await pool.query(`
            SELECT * FROM purchase_invoice_lines 
            WHERE purchase_invoice_header_id = $1
        `, [header.id]);

        console.log(`✅ Found ${linesRes.rows.length} Lines.`);
        linesRes.rows.forEach(l => {
            console.log(`   - Product ID ${l.product_id}: Qty ${l.accepted_qty}, Amt ${l.amount}`);
        });

        // 3. Get Batches
        const batchRes = await pool.query(`
            SELECT * FROM product_batches 
            WHERE purchase_invoice_line_id IN (
                SELECT id FROM purchase_invoice_lines WHERE purchase_invoice_header_id = $1
            )
        `, [header.id]);

        console.log(`✅ Found ${batchRes.rows.length} Batches created.`);
        batchRes.rows.forEach(b => {
            console.log(`   - Batch ${b.batch_number} (Exp: ${b.expiry_date}) - Qty: ${b.initial_qty}`);
        });


        // 4. [NEW] Check Inventory Batches (FIFO System)
        const invRes = await pool.query(`
            SELECT * FROM inventory_batches 
            WHERE grn_id = $1
        `, [header.id]);

        console.log(`✅ Found ${invRes.rows.length} Inventory/Stock Batches (FIFO).`);
        invRes.rows.forEach(b => {
            console.log(`   - FIFO Batch ${b.batch_code} | Remaining: ${b.quantity_remaining}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

verifyGRN();
