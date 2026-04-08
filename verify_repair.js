const { pool } = require('./config/db');
async function verify() {
    try {
        const res = await pool.query(`SELECT id, total_net, grand_total, tax_amount FROM purchase_invoice_headers WHERE id IN (53, 54)`);
        console.log("Updated Totals:");
        console.table(res.rows);
        
        const lineRes = await pool.query(`SELECT id, purchase_invoice_header_id, amount, discount_amount, tax_amount FROM purchase_invoice_lines WHERE purchase_invoice_header_id IN (53, 54)`);
        console.log("\nUpdated Lines:");
        console.table(lineRes.rows);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
verify();
