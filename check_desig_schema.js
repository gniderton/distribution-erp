const { pool } = require('./config/db');
(async () => {
    try {
        const types = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'designations'");
        console.table(types.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
