const { pool } = require('./config/db');
async function run() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'sales_invoices'
        `);
        console.table(res.rows);
    } finally {
        client.release();
        process.exit();
    }
}
run();
