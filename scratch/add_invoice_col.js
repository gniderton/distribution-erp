const { pool } = require('../config/db');
async function run() {
    try {
        await pool.query('ALTER TABLE employee_liabilities ADD COLUMN invoice_id BIGINT REFERENCES sales_invoices(id);');
        console.log('✅ Column invoice_id added successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
