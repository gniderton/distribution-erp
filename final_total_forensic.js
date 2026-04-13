const { pool } = require('./config/db');

async function finalForensic() {
    try {
        console.log('🏛️  FINAL TOTAL FORENSIC AUDIT (Source vs. Ledger)\n');

        // Mappings
        const targets = [
            { name: 'Axis Bank', code: '1001', bankId: 2, coaId: 1 },
            { name: 'IDFC Bank', code: '1002', bankId: 3, coaId: 2 },
            { name: 'Cash in Hand', code: '1003', bankId: 1, coaId: 3 }
        ];

        async function getStats(target) {
            // Source Tables Sum
            const open = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM opening_balances WHERE account_id = $1 AND is_active = true", [target.coaId]);
            const pay = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM customer_payments WHERE bank_id = $1 AND status = 'Verified' AND is_active = true", [target.bankId]);
            const exp = await pool.query("SELECT COALESCE(SUM(grand_total), 0) as total FROM expenses WHERE payment_source_id = $1 AND is_active = true", [target.coaId]);
            const vPay = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM vendor_payments WHERE bank_account_id = $1 AND is_active = true", [target.bankId]);
            
            const tIn = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM internal_transfers WHERE to_account_id = $1 AND is_active = true", [target.coaId]);
            const tOut = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM internal_transfers WHERE from_account_id = $1 AND is_active = true", [target.coaId]);

            const sourceTotal = parseFloat(open.rows[0].total) + 
                               parseFloat(pay.rows[0].total) + 
                               parseFloat(tIn.rows[0].total) - 
                               parseFloat(exp.rows[0].total) - 
                               parseFloat(vPay.rows[0].total) - 
                               parseFloat(tOut.rows[0].total);

            // Ledger Sum
            const ledger = await pool.query("SELECT COALESCE(SUM(debit - credit), 0) as total FROM journal_lines WHERE account_id = $1", [target.coaId]);

            return {
                name: target.name,
                source: sourceTotal,
                ledger: parseFloat(ledger.rows[0].total),
                gap: sourceTotal - parseFloat(ledger.rows[0].total)
            };
        }

        const results = [];
        for (const t of targets) {
            results.push(await getStats(t));
        }

        console.table(results.map(r => ({
            "Account": r.name,
            "Source Reality (DB)": "₹" + r.source.toLocaleString('en-IN', {minimumFractionDigits: 2}),
            "Ledger Position": "₹" + r.ledger.toLocaleString('en-IN', {minimumFractionDigits: 2}),
            "Audit Gap": "₹" + r.gap.toLocaleString('en-IN', {minimumFractionDigits: 2})
        })));

    } catch (e) {
        console.error('❌ Audit Failed:', e.message);
    } finally {
        process.exit(0);
    }
}

finalForensic();
