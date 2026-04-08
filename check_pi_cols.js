const { pool } = require('./config/db');

async function checkCols() {
    console.log("--- Purchase Invoice Lines Columns ---");
    const piLines = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_invoice_lines'");
    console.log(piLines.rows.map(r => r.column_name).join(', '));

    console.log("\n--- Purchase Invoice Headers Columns ---");
    const piHeaders = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_invoice_headers'");
    console.log(piHeaders.rows.map(r => r.column_name).join(', '));

    process.exit(0);
}

checkCols().catch(e => { console.error(e); process.exit(1); });
