const { pool } = require('./config/db');
(async () => {
    try {
        const res = await pool.query(`SELECT pg_get_viewdef('view_employee_details', true)`);
        console.log(res.rows[0].pg_get_viewdef);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
