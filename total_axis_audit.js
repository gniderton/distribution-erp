const { pool } = require('./config/db');

async function totalAxisAudit() {
    try {
        console.log('🕵️ TOTAL AXIS DATA AUDIT (BANK ID 2)...');
        
        // 1. Audit Vendor Payments
        const vp = await pool.query('SELECT COUNT(*) FROM vendor_payments WHERE bank_account_id = 2');
        console.log(`- Vendor Payments for Axis: ${vp.rows[0].count}`);

        // 2. Audit Cheques
        const chqDirect = await pool.query('SELECT COUNT(*) FROM cheques WHERE bank_account_id = 2');
        const chqCleared = await pool.query("SELECT COUNT(*) FROM cheques WHERE bank_account_id = 2 AND status = 'Cleared'");
        console.log(`- Total Cheques for Axis: ${chqDirect.rows[0].count} (Cleared: ${chqCleared.rows[0].count})`);

        // 3. Audit Internal Transfers
        const tfr = await pool.query('SELECT COUNT(*) FROM internal_transfers WHERE from_account_id = 2 OR to_account_id = 2');
        console.log(`- Internal Transfers for Axis: ${tfr.rows[0].count}`);

        // 4. Audit Customer Payments
        const cp = await pool.query('SELECT COUNT(*) FROM customer_payments WHERE bank_id = 2');
        console.log(`- Customer Payments for Axis: ${cp.rows[0].count}`);

        // 5. Audit the View itself (Ignoring IDFC)
        const viewAxis = await pool.query('SELECT COUNT(*) FROM view_unified_liquid_ledger WHERE direct_bank_id = 2');
        console.log(`🚀 ROWS VISIBLE IN VIEW FOR AXIS (ID 2): ${viewAxis.rows[0].count}`);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

totalAxisAudit();
