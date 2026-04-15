const { pool } = require('./config/db');

async function fullSchemaAudit() {
    try {
        const tables = ['purchase_invoice_headers', 'purchase_invoice_lines', 'inventory_batches'];

        for (const table of tables) {
            const res = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);
            console.log(`\n=== ${table.toUpperCase()} (${res.rows.length} columns) ===`);
            res.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`));
        }
    } catch (err) {
        console.error("Audit Error:", err.message);
    } finally {
        process.exit();
    }
}

fullSchemaAudit();
