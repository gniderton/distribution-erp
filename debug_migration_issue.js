const { pool } = require('./config/db');

async function debug() {
    try {
        console.log("--- ROUTES ---");
        const routes = await pool.query("SELECT * FROM routes");
        console.table(routes.rows);

        console.log("\n--- CUSTOMERS (Raw) ---");
        const cust = await pool.query("SELECT customer_name, route_id, dse_id FROM customers LIMIT 5");
        console.table(cust.rows);

        console.log("\n--- EMPLOYEES ---");
        const emps = await pool.query("SELECT id, full_name, designation FROM employees WHERE designation = 'DSE'");
        console.table(emps.rows);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

debug();
