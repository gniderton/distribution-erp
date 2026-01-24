const { pool } = require('./config/db');

async function debug() {
    try {
        console.log("--- Inventory Batches Dump ---");
        const batchRes = await pool.query("SELECT id, product_id, batch_code, quantity_remaining, quantity_initial, status FROM inventory_batches");
        console.table(batchRes.rows);

        console.log("--- Purchase Invoices Dump ---");
        const piRes = await pool.query("SELECT id, invoice_number, grand_total, status FROM purchase_invoice_headers");
        console.table(piRes.rows);

        console.log("--- Debit Notes Dump ---");
        const dnRes = await pool.query("SELECT id, debit_note_number, amount, reason, status FROM debit_notes");
        console.table(dnRes.rows);

        console.log("--- DN Lines Dump ---");
        const dnLinesRes = await pool.query("SELECT * FROM debit_note_lines");
        console.table(dnLinesRes.rows);
    } catch (e) {
        console.error(e);
    }
}
debug();
