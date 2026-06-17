const { pool } = require('../config/db');

async function inspectPayment() {
    try {
        console.log("--- Inspecting payment PAY-26-24 ---");
        const res = await pool.query("SELECT * FROM vendor_payments WHERE payment_number = 'PAY-26-24' OR id = 24");
        if (res.rows.length > 0) {
            res.rows.forEach(r => {
                console.log(JSON.stringify(r, null, 2));
            });
        } else {
            console.log("No payment found with number PAY-26-24 or id 24.");
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await pool.end();
    }
}

inspectPayment();
