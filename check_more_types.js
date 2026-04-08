const { pool } = require('./config/db');
async function checkMore() {
    try {
        const srTypes = await pool.query(`SELECT DISTINCT type FROM sales_returns`);
        console.log("sales_returns types:", srTypes.rows.map(r => r.type));
        
        const dnTypes = await pool.query(`SELECT DISTINCT note_type FROM debit_notes`);
        console.log("debit_notes types:", dnTypes.rows.map(r => r.note_type));

        const oiCat = await pool.query(`SELECT DISTINCT category_account_id FROM other_income`);
        console.log("other_income samples:", oiCat.rows);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkMore();
