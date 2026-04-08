const { pool } = require('./config/db');
async function run() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT column_name, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'customer_payments' AND column_name = 'collected_by'
        `);
        console.table(res.rows);
    } finally {
        client.release();
        process.exit();
    }
}
run();
