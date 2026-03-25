const { pool } = require('./config/db');

async function verify() {
    const views = [
        'view_bank_statement_details', 'view_customer_advance_balance', 'view_advance_utilizations', 
        'view_customer_ledger', 'view_vendor_ledger', 'view_asset_entity_ledger', 
        'view_income_entity_ledger', 'view_expense_entity_ledger', 'view_employee_details'
    ];

    console.log("--- FINAL SECURITY VERIFICATION ---");
    for (const view of views) {
        try {
            const res = await pool.query(`SELECT count(*) FROM public."${view}"`);
            console.log(`[OK] ${view}: ${res.rows[0].count} rows found.`);
        } catch (err) {
            console.error(`[FAIL] ${view}: ${err.message}`);
        }
    }
    process.exit(0);
}

verify();
