const { pool } = require('./config/db');
(async () => {
    try {
        const res = await pool.query(`
            SELECT 
                policyname, 
                roles, 
                cmd, 
                qual, 
                with_check 
            FROM pg_policies 
            WHERE tablename = 'employees'
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
