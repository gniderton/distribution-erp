const { pool } = require('../config/db');
async function check() {
    // Find journal-like tables
    const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%journal%'");
    console.log("Journal tables:", r.rows.map(x => x.table_name));

    // Also check payment_22 (the customer_payment this cheque references)
    const p = await pool.query("SELECT id, customer_id, amount, payment_mode, verification_status, is_active FROM customer_payments WHERE id = 22");
    console.log("\n--- Customer Payment #22 (referenced by cheque) ---");
    console.table(p.rows);

    process.exit();
}
check().catch(e => { console.error(e.message); process.exit(1); });
