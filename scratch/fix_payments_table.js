const { pool } = require('../config/db');
async function run() {
    try {
        await pool.query('ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS remarks TEXT;');
        await pool.query('ALTER TABLE customer_payments DROP CONSTRAINT IF EXISTS customer_payments_payment_mode_check;');
        // Including all current and future modes
        await pool.query(`ALTER TABLE customer_payments ADD CONSTRAINT customer_payments_payment_mode_check 
            CHECK (payment_mode IN ('Cash', 'Cheque', 'UPI', 'Bank Transfer', 'Online', 'NEFT', 'RTGS', 'EMPLOYEE_ADJUSTMENT', 'Advance Adjustment'));`);
        console.log('✅ customer_payments table fixed');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
