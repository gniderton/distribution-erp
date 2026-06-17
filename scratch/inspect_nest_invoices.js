const { pool } = require('../config/db');

async function run() {
    try {
        console.log("=== DEBIT NOTE ALLOCATIONS FOR NEST MARKETING INVOICES ===");
        const res = await pool.query(`
            SELECT 
                dna.id as alloc_id,
                dna.amount as alloc_amount,
                pi.id as invoice_id,
                pi.invoice_number,
                pi.vendor_id as invoice_vendor_id,
                dn.id as dn_id,
                dn.debit_note_number,
                dn.vendor_id as dn_vendor_id,
                dn.status as dn_status,
                dn.note_type as dn_note_type
            FROM debit_note_allocations dna
            JOIN purchase_invoice_headers pi ON dna.purchase_invoice_id = pi.id
            JOIN debit_notes dn ON dna.debit_note_id = dn.id
            WHERE pi.vendor_id = 17
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
