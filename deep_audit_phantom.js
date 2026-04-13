const { pool } = require('./config/db');

async function phantomAudit() {
    try {
        console.log('🏛️  STARTING PHANTOM TRANSACTION AUDIT (IDFC + AXIS)\n');

        // IDs
        const idfcCoa = 25; // Code 1002
        const axisCoa = 24; // Code 1001
        const idfcBank = 3; 
        const axisBank = 2;

        async function auditAccount(name, bankId, coaId) {
            console.log(`\n--- Auditing ${name} ---`);
            
            // 1. Get Source Sum
            const payRes = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM customer_payments WHERE bank_id = $1 AND status = 'Verified' AND is_active = true", [bankId]);
            const expRes = await pool.query("SELECT COALESCE(SUM(grand_total), 0) as total FROM expenses WHERE payment_source_id = $1 AND is_active = true", [coaId]);
            const vPayRes = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM vendor_payments WHERE bank_account_id = $1 AND is_active = true", [bankId]);
            
            // 2. Get Ledger Sum
            const ledgerRes = await pool.query("SELECT COALESCE(SUM(debit - credit), 0) as total FROM journal_lines WHERE account_id = $1", [coaId]);
            
            const sourceTotal = parseFloat(payRes.rows[0].total) - parseFloat(expRes.rows[0].total) - parseFloat(vPayRes.rows[0].total);
            const ledgerTotal = parseFloat(ledgerRes.rows[0].total);

            console.log(`Source Sum (Payments/Bills): ₹${sourceTotal.toFixed(2)}`);
            console.log(`Ledger Sum (Total History): ₹${ledgerTotal.toFixed(2)}`);
            console.log(`Mismatch Gap: ₹${(sourceTotal - ledgerTotal).toFixed(2)}`);
        }

        await auditAccount('IDFC First Bank', idfcBank, idfcCoa);
        await auditAccount('Axis Bank', axisBank, axisCoa);

    } catch (e) {
        console.error('❌ Audit Failed:', e.message);
    } finally {
        process.exit(0);
    }
}

phantomAudit();
