const { pool } = require('./config/db');

async function inventoryTables() {
    try {
        console.log('🕵️ INVENTORYING DATABASE TABLES FOR LIQUID SOURCES...');
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

inventoryTables();
