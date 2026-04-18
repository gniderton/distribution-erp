require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function updateConstraint() {
    const client = await pool.connect();
    try {
        console.log("Updating delivery_status constraint...");
        await client.query('BEGIN');
        
        // 1. Drop the old constraint
        await client.query(`ALTER TABLE sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_delivery_status_check`);
        
        // 2. Add the new expanded constraint
        await client.query(`
            ALTER TABLE sales_invoices 
            ADD CONSTRAINT sales_invoices_delivery_status_check 
            CHECK (delivery_status = ANY (ARRAY[
                'Pending', 'In Transit', 'Delivered', 'Returned', 
                'Partial', 'Undelivered', 'Self-Collected', 
                'Failed', 'Cancelled'
            ]))
        `);
        
        await client.query('COMMIT');
        console.log("Constraint updated successfully! Database is now ready for 'Failed' statuses.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Failed to update constraint:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

updateConstraint();
