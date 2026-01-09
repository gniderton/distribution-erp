const { pool } = require('../config/db');

async function fix() {
    try {
        console.log('--- Fixing Allocation ID 8 ---');
        // Check current state
        const before = await pool.query('SELECT * FROM payment_allocations WHERE id = 8');
        console.log('Before:', before.rows[0]);

        if (Number(before.rows[0].amount) > 50) {
            // Update to 50.00 (The actual payment amount)
            await pool.query('UPDATE payment_allocations SET amount = 50.00 WHERE id = 8');
            console.log('FIX APPLIED: Updated amount to 50.00');
        } else {
            console.log('Skipping: Amount seems correct or changed.');
        }

        const after = await pool.query('SELECT * FROM payment_allocations WHERE id = 8');
        console.log('After:', after.rows[0]);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fix();
