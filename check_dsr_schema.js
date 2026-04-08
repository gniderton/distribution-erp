const { pool } = require('./config/db');

async function checkSchema() {
    try {
        const query = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'daily_sales_reports'
            ORDER BY ordinal_position;
        `;
        const result = await pool.query(query);
        console.log("--- daily_sales_reports Schema ---");
        result.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();
