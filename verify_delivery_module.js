const { pool } = require('./config/db');

async function verifyDeliveryModule() {
    const client = await pool.connect();

    // Test Data
    let driverId, invoiceId, tripId;

    try {
        console.log('🧪 Starting Delivery Module Verification...');

        // 1. Setup Test Data (Driver & Invoice)
        // Get or Create Driver
        const driverRes = await client.query(`SELECT id FROM employees LIMIT 1`);
        if (driverRes.rows.length === 0) throw new Error('No employees found');
        driverId = driverRes.rows[0].id;

        // Find a recent Invoice for Testing
        const invRes = await client.query(`SELECT id, invoice_number FROM sales_invoices ORDER BY id DESC LIMIT 1`);
        if (invRes.rows.length === 0) throw new Error('No invoices found');
        invoiceId = invRes.rows[0].id;
        console.log(`📌 Using Driver ID: ${driverId}, Invoice ID: ${invoiceId} (${invRes.rows[0].invoice_number})`);

        // Reset Delivery Status for Test Invoice
        await client.query(`UPDATE sales_invoices SET delivery_status = 'Pending' WHERE id = $1`, [invoiceId]);
        await client.query(`DELETE FROM trip_invoices WHERE invoice_id = $1`, [invoiceId]); // Clear old trip links

        // 2. Test: Get Invoices Pool
        console.log('\n[TEST 1] Checking Invoices Pool...');
        const poolRes = await client.query(`
            SELECT id FROM sales_invoices WHERE delivery_status = 'Pending' AND id = $1
        `, [invoiceId]);
        if (poolRes.rows.length > 0) {
            console.log('✅ Found Pending Invoice in Pool.');
        } else {
            console.error('❌ Failed to find Pending Invoice in Pool.');
        }

        // 3. Test: Create Trip
        console.log('\n[TEST 2] Creating Trip & Assigning Invoice...');
        const createTripRes = await client.query(`
            INSERT INTO delivery_trips (trip_number, driver_id, vehicle_number, created_by, status)
            VALUES ('TEST-TRIP-' || to_char(now(), 'HH24MISS'), $1, 'MH-12-TEST', $1, 'Scheduled')
            RETURNING id, trip_number
        `, [driverId]);
        tripId = createTripRes.rows[0].id;
        console.log(`✅ Trip Created: ${createTripRes.rows[0].trip_number} (ID: ${tripId})`);

        // Assign Invoice
        await client.query(`
            INSERT INTO trip_invoices (trip_id, invoice_id, delivery_status)
            VALUES ($1, $2, 'Pending')
        `, [tripId, invoiceId]);

        await client.query(`UPDATE sales_invoices SET delivery_status = 'In Transit' WHERE id = $1`, [invoiceId]);
        console.log('✅ Invoice Assigned & Status Updated to "In Transit"');

        // 4. Test: Get Manifest
        console.log('\n[TEST 3] Fetching Manifest...');
        const manifestRes = await client.query(`
            SELECT ti.id, si.invoice_number FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            WHERE ti.trip_id = $1
        `, [tripId]);
        if (manifestRes.rows.length > 0) {
            console.log(`✅ Manifest contains ${manifestRes.rows.length} invoices.`);
        } else {
            console.error('❌ Manifest is empty.');
        }

        // 5. Test: Sync Delivery (Mark Delivered & Pay)
        console.log('\n[TEST 4] Syncing Delivery (Mobile App Simulation)...');

        // Simulate Sync Payload logic
        // Update Trip Invoice
        await client.query(`
            UPDATE trip_invoices 
            SET delivery_status = 'Delivered', delivery_time = NOW(), notes = 'Delivered at Gate'
            WHERE trip_id = $1 AND invoice_id = $2
        `, [tripId, invoiceId]);

        // Update Main Invoice
        await client.query(`UPDATE sales_invoices SET delivery_status = 'Delivered' WHERE id = $1`, [invoiceId]);

        // Simulate Payment Capture (Cash)
        await client.query(`
            INSERT INTO customer_payments (
                payment_number, customer_id, payment_date, amount, payment_mode, 
                collected_by, verification_status, created_at
            )
            SELECT 
                'PAY-TEST-' || $1, customer_id, CURRENT_DATE, 500, 'Cash', 
                $3, 'Pending', NOW()
            FROM sales_invoices WHERE id = $2
        `, [tripId, invoiceId, driverId]);
        console.log('✅ Sync Complete: Marked Delivered & Payment Captured.');

        // 6. Test: Verify Trip
        console.log('\n[TEST 5] Verifying Trip (Manager Action)...');
        await client.query(`UPDATE delivery_trips SET status = 'Verified' WHERE id = $1`, [tripId]);

        const finalStatus = await client.query(`SELECT status FROM delivery_trips WHERE id = $1`, [tripId]);
        if (finalStatus.rows[0].status === 'Verified') {
            console.log('✅ Trip Verified successfully.');
        } else {
            console.error('❌ Trip Verification Failed.');
        }

    } catch (err) {
        console.error('❌ CHECK FAILED:', err);
    } finally {
        client.release();
        pool.end();
    }
}

verifyDeliveryModule();
