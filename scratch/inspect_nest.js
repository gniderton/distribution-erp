const { pool } = require('../config/db');

async function run() {
    try {
        console.log("=== NEST MARKETING DEBIT NOTES & ALLOCATIONS ===");
        const res = await pool.query(`
            SELECT dna.id as alloc_id, dna.amount as alloc_amount, dn.id as dn_id, dn.debit_note_number, dn.amount as dn_amount, dn.status, dn.note_type, dn.reversed_at
            FROM debit_note_allocations dna
            JOIN debit_notes dn ON dna.debit_note_id = dn.id
            WHERE dn.vendor_id = 17
        `);
        console.table(res.rows);

        console.log("\n=== ALL DEBIT NOTES FOR NEST MARKETING ===");
        const res2 = await pool.query(`
            SELECT id, debit_note_number, amount, status, note_type, reversed_at
            FROM debit_notes
            WHERE vendor_id = 17
        `);
        console.table(res2.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
