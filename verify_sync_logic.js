const { pool } = require('./config/db');

async function testSync() {
    console.log('--- Testing Delivery EOD Sync ---');
    const trip_id = 1; // Assuming trip 1 exists from previous phases

    const payload = {
        trip_id: trip_id,
        updates: [
            { invoice_id: 1, status: 'Delivered', timestamp: new Date().toISOString() }
        ],
        payments: [
            { invoice_id: 1, customer_id: 1, amount: 250.00, mode: 'Cash', collected_by: 1, transaction_ref: 'TR-001' }
        ],
        returns: [
            { invoice_id: 1, product_id: 1, qty: 5, return_type: 'Instant Rejection', reason: 'Damaged', batch_id: 1, condition: 'Damaged' }
        ],
        expenses: [
            { dse_id: 1, type: 'Fuel', amount: 50.00, description: 'Filling up' }
        ],
        denominations: {
            dse_id: 1,
            n500: 1, // 500
            total_verified: 500
        }
    };

    try {
        const response = await fetch('http://localhost:3000/api/delivery/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('Result:', result);

        if (result.success) {
            console.log('Sync Logic Verified ✅');
        } else {
            console.log('Sync Failed ❌', result.error);
        }
    } catch (err) {
        console.error('Testing Error:', err.message);
    } finally {
        process.exit();
    }
}

testSync();
