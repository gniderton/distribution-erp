const { pool } = require('../config/db');

async function testTrigger() {
    console.log("Testing Integrity Trigger...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create a dummy payment
        const payRes = await client.query(`
            INSERT INTO customer_payments (customer_id, amount, payment_number, verification_status)
            VALUES (76, 1000.00, 'TEST-TRIG-001', 'Pending')
            RETURNING id
        `);
        const payId = payRes.rows[0].id;
        console.log(`Created Test Payment: ${payId} for ₹1000.00`);

        // 2. Add safe allocation
        await client.query(`
            INSERT INTO customer_payment_allocations (payment_id, invoice_id, amount, status)
            VALUES ($1, 634, 600.00, 'ACTIVE')
        `, [payId]);
        console.log("✅ First allocation (₹600) succeeded.");

        // 3. Add overflowing allocation
        console.log("Attempting overflowing allocation (₹500)...");
        try {
            await client.query(`
                INSERT INTO customer_payment_allocations (payment_id, invoice_id, amount, status)
                VALUES ($1, 632, 500.00, 'ACTIVE')
            `, [payId]);
            console.error("❌ ERROR: Trigger failed to stop over-allocation!");
        } catch (err) {
            if (err.message.includes('OVER_ALLOCATION_ERROR')) {
                console.log("✅ SUCCESS: Trigger blocked over-allocation as expected!");
                console.log(`   Error message: ${err.message}`);
            } else {
                console.error("❌ ERROR: Unexpected error:", err.message);
            }
        }

        await client.query('ROLLBACK'); // Don't save test data
    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

testTrigger();
