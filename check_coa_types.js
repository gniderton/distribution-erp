const { pool } = require('./config/db');
async function checkTypes() {
    try {
        const res = await pool.query(`SELECT DISTINCT type FROM chart_of_accounts`);
        process.stdout.write(JSON.stringify(res.rows.map(r => r.type)));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkTypes();
