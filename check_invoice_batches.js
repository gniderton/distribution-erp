const { pool } = require('./config/db');

async function checkInvoiceBatches() {
    try {
        console.log('--- Checking Recent Invoices for Batch IDs ---');
        const res = await pool.query(`
            SELECT 
                si.id as invoice_id,
                si.invoice_number,
                si.created_at,
                (SELECT count(*) FROM sales_invoice_lines sil WHERE sil.invoice_id = si.id) as line_count,
                (SELECT count(*) FROM sales_invoice_lines sil WHERE sil.invoice_id = si.id AND sil.batch_id IS NULL) as null_batch_count
            FROM sales_invoices si
            ORDER BY si.id DESC
            LIMIT 10
        `);

        if (res.rows.length === 0) {
            console.log('No invoices found.');
        } else {
            console.table(res.rows);
        }

        console.log('\n--- Checking Sample Lines for Latest Invoice ---');
        if (res.rows.length > 0) {
            const latestId = res.rows[0].invoice_id;
            const linesRes = await pool.query(`
                SELECT id, product_id, batch_id, shipped_qty, amount
                FROM sales_invoice_lines
                WHERE invoice_id = $1
                LIMIT 5
            `, [latestId]);
            console.table(linesRes.rows);
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkInvoiceBatches();
