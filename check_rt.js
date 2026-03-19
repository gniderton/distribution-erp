const { pool } = require('./config/db');
(async () => {
    try {
        const res = await pool.query('SELECT * FROM route_types LIMIT 1');
        console.log(Object.keys(res.rows[0] || {}));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
