const { pool } = require('./config/db');
async function checkAssetsNotes() {
    try {
        const assets = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'assets'`);
        console.log("assets:", assets.rows.map(r => r.column_name));
        
        const dn = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'debit_notes'`);
        console.log("debit_notes:", dn.rows.map(r => r.column_name));

        const oi = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'other_income'`);
        console.log("other_income:", oi.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkAssetsNotes();
