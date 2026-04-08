const { pool } = require('./config/db');
async function verify() {
    try {
        const h = await pool.query(`SELECT SUM(total_taxable) as total_taxable_header FROM sales_invoices WHERE invoice_date >= '2026-04-01' AND invoice_date <= '2026-04-30' AND status NOT IN ('Cancelled', 'Reversed')`);
        console.log("True Header Taxable Revenue:", h.rows[0].total_taxable_header);
        
        const j = await pool.query(`SELECT SUM(si.total_taxable) as total_taxable_join FROM sales_invoices si JOIN sales_invoice_lines sil ON si.id = sil.invoice_id WHERE si.invoice_date >= '2026-04-01' AND si.invoice_date <= '2026-04-30' AND si.status NOT IN ('Cancelled', 'Reversed')`);
        console.log("Joined (Wrong) Taxable Revenue:", j.rows[0].total_taxable_join);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
verify();
