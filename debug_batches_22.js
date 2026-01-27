const { pool } = require('./config/db');

async function checkBatches() {
    try {
        console.log("Checking Batches for Product 22:");
        const res22 = await pool.query("SELECT * FROM inventory_batches WHERE product_id = 22");
        if (res22.rows.length === 0) {
            console.log("No batches found for Product 22.");
        } else {
            console.table(res22.rows);
        }

        console.log("\nChecking Batches for Product 21 (Reference):");
        const res21 = await pool.query("SELECT * FROM inventory_batches WHERE product_id = 21");
        console.table(res21.rows);

    } catch (e) {
        console.error(e);
    }
}
checkBatches();
