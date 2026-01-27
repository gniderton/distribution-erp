const { pool } = require('./config/db');

async function deepDive() {
    try {
        const pid = 22;
        console.log(`\n--- DEEP DIVE: PRODUCT ID ${pid} ---\n`);

        // 1. Check Product Master
        const prod = await pool.query("SELECT id, product_name, current_stock FROM products WHERE id = $1", [pid]);
        if (prod.rows.length === 0) {
            console.log("CRITICAL: Product ID 22 does not exist in 'products' table.");
        } else {
            console.log("1. Product Master Data:");
            console.table(prod.rows);
        }

        // 2. Check GRN History (Was it ever received?)
        const grns = await pool.query(`
            SELECT pil.id, pil.purchase_invoice_header_id, pil.accepted_qty, pih.status as grn_status
            FROM purchase_invoice_lines pil
            JOIN purchase_invoice_headers pih ON pil.purchase_invoice_header_id = pih.id
            WHERE pil.product_id = $1
        `, [pid]);

        console.log("\n2. GRN History (Inwarding):");
        if (grns.rows.length === 0) {
            console.log("   No GRN entries found. Value has NEVER been Inwarded.");
        } else {
            console.table(grns.rows);
        }

        // 3. Check Live Batches
        const batches = await pool.query("SELECT * FROM inventory_batches WHERE product_id = $1", [pid]);
        console.log("\n3. Active Batches:");
        if (batches.rows.length === 0) {
            console.log("   No batches found.");
        } else {
            console.table(batches.rows);
        }

    } catch (e) {
        console.error(e);
    }
}
deepDive();
