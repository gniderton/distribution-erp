const { pool } = require('./config/db');

async function research() {
    console.log("--- Public Tables ---");
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    const tables = res.rows.map(r => r.table_name);
    console.log(tables.join(', '));

    console.log("\n--- Checking for Assets/Cash related tables ---");
    const assets = tables.filter(name => name.includes('asset') || name.includes('bank') || name.includes('cash'));
    console.log(assets.join(', '));

    console.log("\n--- Checking migrated purchase invoices (Payables) ---");
    const piCount = await pool.query(`
        SELECT COUNT(*) as count 
        FROM purchase_invoices pi
        LEFT JOIN purchase_invoice_lines pil ON pi.id = pil.invoice_id
        WHERE pil.id IS NULL
    `);
    console.log("Migrated Purchase Invoices (no lines):", piCount.rows[0].count);

    process.exit(0);
}

research().catch(e => {
    console.error(e);
    process.exit(1);
});
