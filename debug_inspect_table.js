const { pool } = require('./config/db');

async function inspect() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'customers'
            ORDER BY column_name
        `);
        console.log('--- CUSTOMERS TABLE COLUMNS ---');
        res.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));
        pool.end();
    } catch (e) {
        console.error(e);
    }
}
inspect();
