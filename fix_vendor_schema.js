const { pool } = require('./config/db');

async function fixVendorSchema() {
    try {
        console.log("--- FIXING VENDOR TABLE SCHEMA ---");
        
        // Add missing columns if they don't exist
        await pool.query(`
            ALTER TABLE vendors 
            ADD COLUMN IF NOT EXISTS credit_limit_amount NUMERIC(15, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS credit_period_days INT DEFAULT 0
        `);

        console.log("SUCCESS: 'credit_limit_amount' and 'credit_period_days' columns added to 'vendors' table.");
        
        // Verify columns
        const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'vendors'");
        console.log("Current Columns:", r.rows.map(x=>x.column_name).join(', '));

    } catch (err) {
        console.error("Critical Failure fixing vendor schema:", err);
    } finally {
        await pool.end();
    }
}

fixVendorSchema();
