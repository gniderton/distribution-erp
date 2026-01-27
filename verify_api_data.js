const { pool } = require('./config/db');

async function verify() {
    try {
        console.log("--- EMPLOYEES ---");
        const empRes = await pool.query("SELECT employee_code, full_name, designation FROM employees WHERE employment_status = 'Active' LIMIT 3");
        console.table(empRes.rows);

        console.log("\n--- CUSTOMERS ---");
        const custRes = await pool.query(`
            SELECT c.customer_code, c.customer_name, r.route_name 
            FROM customers c 
            LEFT JOIN routes r ON c.route_id = r.id 
            LIMIT 3
        `);
        console.table(custRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

verify();
