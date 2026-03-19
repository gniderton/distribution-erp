const { pool } = require('./config/db');
(async () => {
    try {
        const types = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees'`);
        console.log(types.rows.filter(r => ['designation'].includes(r.column_name)));
        const res = await pool.query('SELECT * FROM employees LIMIT 3');
        console.log(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
