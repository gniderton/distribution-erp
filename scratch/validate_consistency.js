const { pool } = require('../config/db');

async function validateConsistency() {
    const client = await pool.connect();
    try {
        console.log('--- Validating GRN vs Batch Consistency ---');

        // Check for mismatches: Sum of Batch Initial Qty vs Invoice Line Accepted Qty
        const mismatch = await client.query(`
            SELECT 
                pil.purchase_invoice_header_id as grn_id,
                pil.product_id,
                pil.accepted_qty as line_qty,
                SUM(ib.quantity_initial) as batch_sum_qty
            FROM purchase_invoice_lines pil
            JOIN inventory_batches ib ON ib.purchase_invoice_line_id = pil.id
            GROUP BY pil.id, pil.purchase_invoice_header_id, pil.product_id, pil.accepted_qty
            HAVING pil.accepted_qty != SUM(ib.quantity_initial)
        `);

        if (mismatch.rows.length === 0) {
            console.log('✅ Consistency Check Passed: All Batch Initial quantities match Invoice Line Accepted quantities.');
        } else {
            console.log('⚠️ Consistency Warning: Found mismatches between Invoice Lines and Batches!');
            console.table(mismatch.rows);
        }

    } catch (err) {
        console.error('Validation error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

validateConsistency();
