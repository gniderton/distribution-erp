const { pool } = require('./config/db');

async function deepProbeChequesAndVendors() {
    try {
        console.log('🕵️ DEEP PROBING CHEQUE REPOSITORY & VENDOR PAYMENTS...');
        
        const tables = ['cheques', 'vendor_payments'];
        for (const table of tables) {
            console.log(`\n--- ${table.toUpperCase()} ---`);
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
            `);
            console.table(res.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

deepProbeChequesAndVendors();
