const { pool } = require('./config/db');
(async () => {
    try {
        const res = await pool.query(`
            SELECT e.employee_code, e.full_name, e.login_pin, e.employment_status, d.title 
            FROM employees e 
            JOIN designations d ON e.designation_id = d.id 
            WHERE d.department = 'Sales'
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
