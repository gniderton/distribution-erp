const { pool } = require('./config/db');

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'dse_expenses' AND column_name = 'status';
        `);

        if (res.rows.length > 0) {
            console.log("Column 'status' exists in 'dse_expenses'. Schema likely applied.");
        } else {
            console.log("Column 'status' MISSING in 'dse_expenses'. Schema NOT applied.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();
