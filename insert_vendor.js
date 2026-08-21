const { pool } = require('./config/db');

async function test() {
    try {
        await pool.query("INSERT INTO vendors (id, vendor_name) VALUES (2, 'Test') ON CONFLICT (id) DO NOTHING");
        console.log("inserted vendor");
    } catch (e) {
        console.error(e.message);
    } finally {
        pool.end();
    }
}
test();
