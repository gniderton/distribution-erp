const { pool } = require('./config/db');
async function checkAccountingSchema() {
    try {
        const pih = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_invoice_headers'`);
        console.log("purchase_invoice_headers:", pih.rows.map(r => r.column_name));
        
        const vp = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'vendor_payments'`);
        console.log("vendor_payments:", vp.rows.map(r => r.column_name));

        const ba = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'bank_accounts'`);
        console.log("bank_accounts:", ba.rows.map(r => r.column_name));

        const loans = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'loans'`);
        console.log("loans:", loans.rows.map(r => r.column_name));
        
        const coa = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'chart_of_accounts'`);
        console.log("chart_of_accounts:", coa.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkAccountingSchema();
