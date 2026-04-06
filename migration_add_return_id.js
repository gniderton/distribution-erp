const { pool } = require('./config/db');

async function migrate() {
    try {
        console.log("Checking for 'return_id' in 'customer_payment_allocations'...");
        
        await pool.query(`
            ALTER TABLE customer_payment_allocations 
            ADD COLUMN IF NOT EXISTS return_id BIGINT REFERENCES sales_returns(id) ON DELETE CASCADE
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_cust_alloc_return ON customer_payment_allocations(return_id)
        `);

        console.log("✅ Migration Successful.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
