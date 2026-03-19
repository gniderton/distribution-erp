const { pool } = require('./config/db');

(async () => {
    try {
        // Query to check if the 'designations' table exists
        const desigCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'designations'
            ) as exists;
        `);
        console.log('"designations" table exists:', desigCheck.rows[0].exists);

        if (desigCheck.rows[0].exists) {
            console.log('\ndesignations table data:');
            const desigs = await pool.query('SELECT * FROM designations LIMIT 20');
            console.table(desigs.rows);
        }

        console.log('\nDistinct designations from employees table:');
        const emps = await pool.query('SELECT DISTINCT designation FROM employees');
        console.table(emps.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
