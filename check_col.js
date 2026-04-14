const { pool } = require('./config/db');

async function checkSpecificColumn() {
    try {
        console.log("🕵️ Checking specifically for 'vendor_address_id' in 'vendors' table...");
        
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'vendors' AND column_name = 'vendor_address_id'
        `);

        if (result.rows.length > 0) {
            console.log("✅ CONFIRMED: Column 'vendor_address_id' exists.");
            console.table(result.rows);
        } else {
            console.log("❌ NOT FOUND: Column 'vendor_address_id' does NOT exist in 'vendors' table.");
            
            // List all columns to be double sure
            const allCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'vendors'`);
            console.log("Current columns in 'vendors':", allCols.rows.map(r => r.column_name).join(', '));
        }

    } catch (err) {
        console.error("Probe Error:", err);
    } finally {
        process.exit();
    }
}

checkSpecificColumn();
