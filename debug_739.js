const { pool } = require('./config/db');

async function debugInvoice739() {
    try {
        console.log('--- Checking Invoice 739 Lines ---');
        const linesRes = await pool.query(`
            SELECT id, product_id, batch_id, shipped_qty, amount
            FROM sales_invoice_lines
            WHERE invoice_id = 739
        `);
        console.table(linesRes.rows);

        console.log('\n--- Checking Stock Traceability for Invoice 739 ---');
        const traceRes = await pool.query(`
            SELECT id, product_id, batch_id, quantity_change, reference_id, reference_type
            FROM stock_traceability
            WHERE reference_id = 739 AND reference_type = 'Sales Invoice'
        `);
        console.table(traceRes.rows);

        if (traceRes.rows.length === 0) {
            console.log('\n--- Checking IF INVOICE WAS CREATED VIA ANOTHER PATH ---');
            const invRes = await pool.query('SELECT * FROM sales_invoices WHERE id = 739');
            console.table(invRes.rows);
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

debugInvoice739();
