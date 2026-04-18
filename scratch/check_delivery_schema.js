const { pool } = require('./config/db');

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        console.log("--- EXISTING TABLES ---");
        console.table(res.rows);

        const tripColRes = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name LIKE '%trip%' 
               OR table_name LIKE '%delivery%'
            ORDER BY table_name, ordinal_position
        `);
        console.log("\n--- TRIP/DELIVERY COLUMNS ---");
        console.table(tripColRes.rows);

    } catch (err) {
        console.error("Schema Check Error:", err);
    } finally {
        await pool.end();
    }
}

checkSchema();
