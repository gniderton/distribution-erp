const { pool } = require('./config/db');

async function inspectSchema() {
    const client = await pool.connect();
    try {
        console.log("🔍 Inspecting sales_orders columns...");
        const soCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sales_orders'
            ORDER BY ordinal_position
        `);
        console.table(soCols.rows);

        console.log("\n🔍 Inspecting sales_invoices columns...");
        const siCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sales_invoices'
            ORDER BY ordinal_position
        `);
        console.table(siCols.rows);

        console.log("\n🔍 Inspecting sales_invoice_lines columns...");
        const silCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sales_invoice_lines'
            ORDER BY ordinal_position
        `);
        console.table(silCols.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit();
    }
}

inspectSchema();
