const { Pool } = require('pg');
const pool = new Pool({ 
    connectionString: 'postgres://postgres:gniderton7@distribution-erp.onrender.com/erp_db?ssl=true' 
});

async function run() {
    try {
        console.log("Adding column...");
        await pool.query('ALTER TABLE employee_salaries ADD COLUMN IF NOT EXISTS misc_liabilities NUMERIC(12,2) DEFAULT 0');
        console.log("Column added successfully!");
    } catch (e) {
        console.error("FAILED:", e.message);
    } finally {
        await pool.end();
    }
}
run();
