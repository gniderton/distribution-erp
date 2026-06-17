const { pool } = require('../config/db');
async function run() {
    const res = await pool.query(`SELECT definition FROM pg_views WHERE viewname = 'view_customer_ledger'`);
    const def = res.rows[0].definition;
    const lines = def.split('\n');
    const paymentLines = lines.filter(l => l.includes('customer_payments'));
    console.log("Lines containing 'customer_payments':");
    console.log(paymentLines.join('\n'));
    
    // Find the SELECT block for customer_payments
    const startIdx = lines.findIndex(l => l.includes('FROM customer_payments'));
    if (startIdx !== -1) {
        console.log("\n--- customer_payments SELECT block ---");
        console.log(lines.slice(startIdx - 10, startIdx + 5).join('\n'));
    }
    process.exit();
}
run();
