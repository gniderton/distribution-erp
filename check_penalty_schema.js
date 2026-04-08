const { pool } = require('./config/db');
async function checkPenalties() {
    try {
        const vp = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'vendor_penalties'`);
        console.log("vendor_penalties:", vp.rows.map(r => r.column_name));
        
        const ip = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'income_penalties'`);
        console.log("income_penalties:", ip.rows.map(r => r.column_name));

        const ep = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'expense_penalties'`);
        console.log("expense_penalties:", ep.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkPenalties();
