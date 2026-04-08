const { pool } = require('./config/db');
async function checkCols() {
    try {
        const sil = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_invoice_lines'`);
        console.log("sales_invoice_lines:", sil.rows.map(r => r.column_name));
        
        const srl = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_return_lines'`);
        console.log("sales_return_lines:", srl.rows.map(r => r.column_name));
        
        const ib = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_batches'`);
        console.log("inventory_batches:", ib.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkCols();
