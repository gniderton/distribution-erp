const { pool } = require('./config/db');

async function findColumns() {
    try {
        console.log('--- Searching for address columns ---');
        const res = await pool.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE column_name ILIKE '%address%'
               OR column_name ILIKE '%street%'
               OR column_name ILIKE '%city%'
               OR column_name ILIKE '%district%'
        `);
        console.table(res.rows);

        console.log('--- Searching for HSN table ---');
        const res2 = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name ILIKE '%hsn%'
        `);
        console.table(res2.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

findColumns();
