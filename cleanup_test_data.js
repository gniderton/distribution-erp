
const { pool } = require('./config/db');

async function cleanupTestData() {
    try {
        console.log('--- Cleaning Up Test Data ---');
        
        // 1. Wipe test collections
        await pool.query('DELETE FROM warehouse_collections');
        console.log('Deleted all records from warehouse_collections.');

        // 2. Reset ID Sequence
        await pool.query('ALTER SEQUENCE warehouse_collections_id_seq RESTART WITH 1');
        console.log('Reset ID sequence to 1.');

        // 3. Reset Invoice Status
        await pool.query("UPDATE sales_invoices SET delivery_status = 'Pending' WHERE id = 810");
        console.log('Reset Invoice 810 status to Pending.');

        console.log('✅ Cleanup successful!');
    } catch (err) {
        console.error('❌ Cleanup failed:', err.message);
    } finally {
        await pool.end();
    }
}

cleanupTestData();
