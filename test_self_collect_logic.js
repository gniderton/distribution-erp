
const { pool } = require('./config/db');

async function testSelfCollectionLogic() {
    console.log('--- Testing Self-Collection Logic ---');
    
    // 1. Test Blocked Case (ID 869 is 'In Transit' / 'Scheduled')
    try {
        console.log('Testing Blocked Case (Invoice 869 - In Transit)...');
        // We'll simulate the logic inside a function to avoid needing a web server for the test
        const result = await verifyAndCollect(869, 'Test Name', '12345', 'Aadhar', 'ID-123');
        console.log('❌ FAIL: Managed to collect an In-Transit invoice!');
    } catch (e) {
        console.log('✅ SUCCESS: Correctly blocked In-Transit collection. Message:', e.message);
    }

    // 2. Test Success Case
    try {
        const pending = await pool.query("SELECT id FROM sales_invoices WHERE delivery_status = 'Pending' LIMIT 1");
        if (pending.rows.length > 0) {
            const id = pending.rows[0].id;
            console.log(`Testing Success Case (Invoice ${id} - Pending)...`);
            await verifyAndCollect(id, 'Rajesh Kumar', '9812345678', 'Driving License', 'DL-999-XYZ');
            console.log('✅ SUCCESS: Successfully collected Pending invoice.');
        } else {
            console.log('⚠️ No Pending invoices found to test Success case.');
        }
    } catch (e) {
        console.log('❌ FAIL: Failed to collect Pending invoice. Error:', e.message);
    }

    await pool.end();
}

async function verifyAndCollect(invoice_id, name, phone, id_type, id_val) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const invRes = await client.query(`SELECT delivery_status FROM sales_invoices WHERE id = $1 FOR UPDATE`, [invoice_id]);
        const inv = invRes.rows[0];

        if (inv.delivery_status !== 'Pending' && inv.delivery_status !== 'Undelivered') {
            throw new Error(`Invoice status ${inv.delivery_status} blocked.`);
        }

        const tripCheck = await client.query(`SELECT 1 FROM trip_invoices ti JOIN delivery_trips dt ON ti.trip_id = dt.id WHERE ti.invoice_id = $1 AND dt.status IN ('Scheduled', 'In Transit')`, [invoice_id]);
        if (tripCheck.rows.length > 0) {
            throw new Error('Assigned to an active trip.');
        }

        await client.query(`UPDATE sales_invoices SET delivery_status = 'Self-Collected' WHERE id = $1`, [invoice_id]);
        await client.query(`INSERT INTO warehouse_collections (invoice_id, collector_name, collector_phone, collector_id_type, collector_id_number, created_by) VALUES ($1, $2, $3, $4, $5, 1)`, [invoice_id, name, phone, id_type, id_val]);
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

testSelfCollectionLogic();
