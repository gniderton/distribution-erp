const { pool } = require('./config/db');

async function updateSchema() {
    try {
        console.log("Updating employee_salaries schema...");
        await pool.query(`
            ALTER TABLE employee_salaries 
            ADD COLUMN IF NOT EXISTS adjusted_base_salary NUMERIC(12,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS bonus_addition NUMERIC(12,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS leave_encashment NUMERIC(12,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS total_deductions NUMERIC(12,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS total_additions NUMERIC(12,2) DEFAULT 0;
        `);
        console.log("Schema updated successfully.");
    } catch (err) {
        console.error("Error updating schema:", err.message);
    } finally {
        await pool.end();
    }
}

updateSchema();
