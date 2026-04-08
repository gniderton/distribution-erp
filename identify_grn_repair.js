const { pool } = require('./config/db');
async function identify() {
    try {
        const res = await pool.query(`
            SELECT 
                pih.id as header_id, 
                pih.invoice_number, 
                pih.grand_total as current_grand_total,
                pih.total_net as current_total_net,
                pih.tax_amount as current_tax_amount,
                COUNT(pil.id) as line_count
            FROM purchase_invoice_headers pih
            JOIN purchase_invoice_lines pil ON pih.id = pil.purchase_invoice_header_id
            WHERE pil.discount_percent > 0
            GROUP BY pih.id, pih.invoice_number, pih.grand_total, pih.total_net, pih.tax_amount
            ORDER BY pih.id DESC
        `);
        console.log("--- GRNs needing repair ---");
        console.table(r.rows); // Fixed typo from previous failed attempt
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
// Using a slightly different approach to avoid console.table issues with long objects if any
async function identifyFix() {
    try {
        const res = await pool.query(`
            SELECT 
                pih.id as header_id, 
                pih.invoice_number, 
                pih.grand_total as current_grand_total,
                pih.total_net as current_total_net,
                pih.tax_amount as current_tax_amount,
                COUNT(pil.id) as line_count
            FROM purchase_invoice_headers pih
            JOIN purchase_invoice_lines pil ON pih.id = pil.purchase_invoice_header_id
            WHERE pil.discount_percent > 0
            GROUP BY pih.id, pih.invoice_number, pih.grand_total, pih.total_net, pih.tax_amount
            ORDER BY pih.id DESC
        `);
        console.log("Affected Invoices:");
        res.rows.forEach(row => {
            console.log(`ID: ${row.header_id} | Num: ${row.invoice_number} | Lines: ${row.line_count} | Total: ${row.current_grand_total}`);
        });
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
identifyFix();
