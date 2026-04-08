const { pool } = require('./config/db');
async function run() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sales_invoices' AND column_name IN ('delivery_status', 'status')
        `);
        console.table(res.rows);
    } finally {
        client.release();
        process.exit();
    }
}
run();
