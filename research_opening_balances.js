const { pool } = require('./config/db');

async function research() {
    console.log("--- Opening Capital Research (Corrected) ---");

    // 1. Inventory (Migrated Stock)
    const invRes = await pool.query(`
        SELECT COALESCE(SUM(quantity_remaining * purchase_rate), 0) as total_inv
        FROM inventory_batches 
        WHERE grn_id IS NULL AND purchase_invoice_line_id IS NULL
    `);
    console.log("Migrated Inventory Value (sum of purchase_rate * quantity_remaining):", invRes.rows[0].total_inv);

    // 2. Receivables (Opening Balances)
    const recRes = await pool.query(`
        SELECT COALESCE(SUM(balance_amount), 0) as total_rec
        FROM sales_invoices
        WHERE sales_order_id IS NULL AND delivery_status != 'Cancelled'
    `);
    console.log("Opening Receivables (migrated invoices balance):", recRes.rows[0].total_rec);

    // 3. Payables (Opening Balances)
    const payRes = await pool.query(`
        SELECT COALESCE(SUM(balance_amount), 0) as total_pay
        FROM purchase_invoice_headers pih
        LEFT JOIN purchase_invoice_lines pil ON pih.id = pil.invoice_id
        WHERE pil.id IS NULL
    `);
    console.log("Opening Payables (migrated headers without lines):", payRes.rows[0].total_pay);

    // 4. Loans
    // Check loan columns
    const loanCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'loans'");
    console.log("Loan Columns:", loanCols.rows.map(r => r.column_name).join(', '));
    
    const loanRes = await pool.query(`
        SELECT 
            COALESCE(SUM(CASE WHEN loan_type = 'GIVEN' THEN balance_amount ELSE 0 END), 0) as total_given,
            COALESCE(SUM(CASE WHEN loan_type = 'TAKEN' THEN balance_amount ELSE 0 END), 0) as total_taken
        FROM loans
        WHERE status = 'Active'
    `);
    console.log("Loans Given:", loanRes.rows[0].total_given);
    console.log("Loans Taken:", loanRes.rows[0].total_taken);

    // 5. Assets
    // Check asset columns
    const assetCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'assets'");
    console.log("Asset Columns:", assetCols.rows.map(r => r.column_name).join(', '));

    const assetRes = await pool.query(`
        SELECT COALESCE(SUM(current_value), 0) as total_assets
        FROM assets
    `);
    console.log("Fixed Assets Value:", assetRes.rows[0].total_assets);

    // 6. Cash/Bank
    // Check bank columns
    const bankCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'bank_accounts'");
    console.log("Bank Columns:", bankCols.rows.map(r => r.column_name).join(', '));
    
    // Some bank_accounts might have account_type = 'Cash' or 'Bank'
    const bankRes = await pool.query(`
        SELECT account_type, COALESCE(SUM(current_balance), 0) as balance
        FROM bank_accounts
        GROUP BY account_type
    `);
    console.log("Balances by Type:", bankRes.rows);

    process.exit(0);
}

research().catch(e => {
    console.error(e);
    process.exit(1);
});
