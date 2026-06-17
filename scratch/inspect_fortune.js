const { pool } = require('../config/db');

async function run() {
    try {
        console.log("=== FORTUNE ENTERPRISES INVOICES ===");
        const res = await pool.query(`
            SELECT id, invoice_number, grand_total, status
            FROM purchase_invoice_headers
            WHERE vendor_id = 10
        `);
        console.table(res.rows);

        console.log("\n=== FORTUNE ENTERPRISES DEBIT NOTES ===");
        const res2 = await pool.query(`
            SELECT id, debit_note_number, amount, status, note_type, reason
            FROM debit_notes
            WHERE vendor_id = 10
        `);
        console.table(res2.rows);

        console.log("\n=== FORTUNE ENTERPRISES ALLOCATIONS ===");
        const res3 = await pool.query(`
            SELECT dna.id as alloc_id, dna.amount as alloc_amount, pi.id as invoice_id, pi.invoice_number, pi.status as invoice_status, dn.id as dn_id, dn.debit_note_number, dn.amount as dn_amount
            FROM debit_note_allocations dna
            JOIN purchase_invoice_headers pi ON dna.purchase_invoice_id = pi.id
            JOIN debit_notes dn ON dna.debit_note_id = dn.id
            WHERE pi.vendor_id = 10 OR dn.vendor_id = 10
        `);
        console.table(res3.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
