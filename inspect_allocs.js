// inspect_allocs.js
const { pool } = require('./config/db');

async function inspect() {
    try {
        console.log("--- TABLE: payment_allocations ---");
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'payment_allocations'
        `);
        console.table(res.rows);

        console.log("--- TABLE: customer_payment_allocations ---");
        const res2 = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'customer_payment_allocations'
        `);
        console.table(res2.rows);

        console.log("--- Foreign Keys for payment_allocations ---");
        const res3 = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'payment_allocations'::regclass;
        `);
        console.table(res3.rows);

    } catch (err) {
        console.error(err.message);
    } finally {
        pool.end();
    }
}

inspect();
