const { pool } = require('./config/db');

async function testLogic() {
    try {
        const product_id = '23'; // As per dump
        const status = 'Good';
        const batch_code = 'BT 26 100';

        console.log(`Searching for: Product ${product_id}, Status '${status}', Batch '${batch_code}'`);

        const query = `
            SELECT id, quantity_remaining, batch_code, status 
            FROM inventory_batches 
            WHERE product_id = $1 
            AND quantity_remaining > 0 
            AND status = $2
            AND batch_code = $3
        `;

        const res = await pool.query(query, [product_id, status, batch_code]);
        console.log("Result Count:", res.rows.length);
        console.table(res.rows);

        if (res.rows.length === 0) {
            console.log("No match found! Checking partial matches...");
            // Check without batch code
            const res2 = await pool.query(`SELECT * FROM inventory_batches WHERE product_id = $1`, [product_id]);
            console.log("Batches for Product 23:");
            console.table(res2.rows);
        }

    } catch (e) {
        console.error(e);
    }
}
testLogic();
