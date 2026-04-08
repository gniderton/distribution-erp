const { pool } = require('./config/db');
async function checkTableLinks() {
    try {
        const banks = await pool.query(`SELECT * FROM bank_accounts`);
        console.log("Bank Accounts:");
        console.table(banks.rows);

        const exp = await pool.query(`
            SELECT DISTINCT e.payment_source_id, coa.name as coa_name, coa.type as coa_type
            FROM expenses e
            LEFT JOIN chart_of_accounts coa ON e.payment_source_id = coa.id
        `);
        console.log("Expense Payment Sources Mapping:");
        console.table(exp.rows);
        
        const vp = await pool.query(`
            SELECT DISTINCT vp.bank_account_id, ba.bank_name
            FROM vendor_payments vp
            LEFT JOIN bank_accounts ba ON vp.bank_account_id = ba.id
        `);
        console.log("Vendor Payment Bank Mapping:");
        console.table(vp.rows);
        
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkTableLinks();
