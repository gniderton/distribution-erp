const { pool } = require('./config/db');

async function probeCustomerPayments() {
    try {
        console.log('🕵️ PROBING CUSTOMER_PAYMENTS SCHEMA...');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'customer_payments'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

probeCustomerPayments();
