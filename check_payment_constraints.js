const { pool } = require('./config/db');

async function check() {
    try {
        console.log("--- customer_payments ---");
        const res1 = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'customer_payments'
        `);
        console.table(res1.rows);

        console.log("\n--- payment_allocations ---");
        const res2 = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'payment_allocations'
        `);
        console.table(res2.rows);

        console.log("\n--- Constraints on payment_allocations ---");
        const res3 = await pool.query(`
            SELECT
                conname AS constraint_name,
                pg_get_constraintdef(c.oid) AS constraint_definition
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'payment_allocations'::regclass;
        `);
        console.table(res3.rows);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
