const { pool } = require('./config/db');
async function run() {
    const client = await pool.connect();
    try {
        let res = await client.query("SELECT * FROM customer_payments WHERE amount = 400");
        console.log("PAYMENTS:", res.rows);
        
        res = await client.query("SELECT * FROM customer_payment_allocations WHERE amount = 400");
        console.log("ALLOCATIONS:", res.rows);
    } finally {
        client.release();
        process.exit();
    }
}
run();
