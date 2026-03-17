const { pool } = require('./config/db');

async function testApi() {
    try {
        console.log('--- Testing Bank Details API (LIST) ---');
        const listResult = await pool.query(`
            SELECT id, bank_name, account_number, ifsc_code
            FROM bank_accounts 
            WHERE is_active = true AND account_number != 'CASH'
            ORDER BY id ASC
        `);
        console.log('Bank List Count:', listResult.rows.length);
        console.log('Sample from List:', listResult.rows[0]);

        console.log('\n--- Testing Single Bank Detail API (ID=3) ---');
        const singleResult = await pool.query(`
            SELECT bank_name, account_number, ifsc_code
            FROM bank_accounts 
            WHERE id = 3
        `);
        console.log('Bank ID 3 Result:', singleResult.rows[0] || 'NOT FOUND');

        console.log('\n--- Testing Unified Details API (DSE Phone) ---');
        const detailResult = await pool.query(`
            SELECT 
                so.id, 
                e.full_name as dse_name, 
                e.contact_primary as dse_phone
            FROM sales_orders so
            LEFT JOIN employees e ON e.id = so.dse_id
            WHERE so.id = 140
        `);
        console.log('Detail Result:', detailResult.rows[0]);
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        pool.end();
    }
}

testApi();
