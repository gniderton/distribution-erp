const { pool } = require('./config/db');

async function probeVendorSchema() {
    try {
        console.log("🕵️ Probing Vendor Schema...");
        
        const vendorCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'vendors'
        `);
        console.log("\n--- Vendors Table ---");
        console.table(vendorCols.rows);

        const addrCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'vendor_addresses'
        `);
        console.log("\n--- Vendor Addresses Table ---");
        console.table(addrCols.rows);

    } catch (err) {
        console.error("Probe Error:", err);
    } finally {
        process.exit();
    }
}

probeVendorSchema();
