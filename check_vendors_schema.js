const { pool } = require('./config/db');

async function run() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'vendors' 
            ORDER BY ordinal_position
        `);
        console.log('--- vendors table ---');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
