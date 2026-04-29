const { pool } = require('../config/db');

async function verifyGrnKnockoff() {
    console.log("Starting GRN Auto-Knockoff Verification...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Setup Test Data
        const vendorRes = await client.query("INSERT INTO vendors (vendor_name, vendor_code, gst) VALUES ('TEST VENDOR KNOCKOFF', 'TVK001', '32ABCDE1234F1Z5') RETURNING id");
        const vendorId = vendorRes.rows[0].id;
        console.log(`- Created Test Vendor: ${vendorId}`);

        // 2. Create a Financial Debit Note
        const dnAmount = 1000;
        const dnRes = await client.query(`
            INSERT INTO debit_notes (vendor_id, debit_note_number, debit_note_date, amount, reason, status, note_type)
            VALUES ($1, 'DN-TEST-AUTO', CURRENT_DATE, $2, 'Auto-Knockoff Test', 'Approved', 'Debit Note')
            RETURNING id
        `, [vendorId, dnAmount]);
        const dnId = dnRes.rows[0].id;
        console.log(`- Created Test Debit Note: ${dnId} (Amount: ${dnAmount})`);

        // 3. Create a GRN
        const grnAmount = 5000;
        const lines = JSON.stringify([{
            product_id: 1, // Assume PID 1 exists
            ordered_qty: 10,
            accepted_qty: 10,
            rate: 400,
            mrp: 500,
            amount: 4000,
            tax_amount: 1000,
            batch_number: 'BATCH-AUTO-TEST'
        }]);

        console.log("- Triggering GRN via create_purchase_invoice...");
        const grnRes = await client.query(`
            SELECT create_purchase_invoice(
                $1::bigint, 0::bigint, 'INV-AUTO-TEST', CURRENT_DATE, CURRENT_DATE,
                4000::numeric, 1000::numeric, 5000::numeric, $2::jsonb, NULL::bigint
            ) as response
        `, [vendorId, lines]);
        
        const grnId = grnRes.rows[0].response.id;
        console.log(`- Created Test GRN: ${grnId} (Amount: ${grnAmount})`);

        // 4. Verify Knockoff
        const allocRes = await client.query(`
            SELECT * FROM debit_note_allocations 
            WHERE debit_note_id = $1 AND purchase_invoice_id = $2
        `, [dnId, grnId]);

        if (allocRes.rows.length > 0) {
            console.log(`SUCCESS: Auto-Knockoff detected! Allocated Amount: ${allocRes.rows[0].amount}`);
            if (Number(allocRes.rows[0].amount) === dnAmount) {
                console.log("Verified: Exact amount allocated.");
            } else {
                console.warn(`WARNING: Amount mismatch. Expected ${dnAmount}, got ${allocRes.rows[0].amount}`);
            }
        } else {
            console.error("FAILURE: No auto-knockoff record found!");
        }

        await client.query('ROLLBACK'); // Clean up
        console.log("Cleanup: Transaction rolled back.");
    } catch (err) {
        console.error("Verification Error:", err.message);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        await pool.end();
    }
}

verifyGrnKnockoff();
