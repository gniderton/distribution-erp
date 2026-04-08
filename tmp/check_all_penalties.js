const { pool } = require('../config/db');
async function check() {
    const t = async (label, sql, params=[]) => {
        const r = await pool.query(sql, params);
        console.log(`\n--- ${label} (${r.rows.length} rows) ---`);
        if (r.rows.length) console.table(r.rows);
    };
    await t('Penalty Invoices (sales_invoices)', "SELECT id, invoice_number, customer_id, grand_total, status FROM sales_invoices WHERE invoice_number LIKE 'PEN%' OR invoice_number LIKE 'DN%'");
    await t('Vendor Penalties', "SELECT * FROM vendor_penalties ORDER BY created_at DESC LIMIT 10");
    await t('Income Penalties', "SELECT * FROM income_penalties ORDER BY created_at DESC LIMIT 10");
    await t('Expense Penalties', "SELECT * FROM expense_penalties ORDER BY created_at DESC LIMIT 10");
    process.exit();
}
check().catch(e => { console.error(e); process.exit(1); });
