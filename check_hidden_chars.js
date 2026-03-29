const { pool } = require('./config/db');
(async () => {
    try {
        const res = await pool.query(`
            SELECT 
                employee_code, 
                LENGTH(employee_code) as len_code,
                login_pin,
                LENGTH(login_pin) as len_pin
            FROM employees 
            WHERE employment_status = 'Active'
        `);
        console.table(res.rows.map(r => ({
            ...r,
            has_spaces_code: r.employee_code && (r.employee_code.startsWith(' ') || r.employee_code.endsWith(' ')),
            has_spaces_pin: r.login_pin && (r.login_pin.startsWith(' ') || r.login_pin.endsWith(' '))
        })));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
