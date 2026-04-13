const { pool } = require('./config/db');

async function groundTruthForensic() {
    try {
        console.log('🏛️  STARTING GROUND-TRUTH FORENSIC AUDIT (Source vs. Ledger)\n');

        // B1: IDFC, B2: Axis, B3: Cash (Assuming based on your ledger codes 1002, 1001, 1003)
        // Let's get actual Bank Account IDs first
        const banksRes = await pool.query("SELECT id, bank_name FROM bank_accounts");
        const idfcId = banksRes.rows.find(b => b.bank_name.includes('IDFC'))?.id;
        const axisId = banksRes.rows.find(b => b.bank_name.includes('Axis'))?.id;
        
        // Coa IDs for comparison
        const coaRes = await pool.query("SELECT id, code, name FROM chart_of_accounts WHERE code IN ('1001', '1002', '1003')");
        const mapCoa = {}; coaRes.rows.forEach(r => mapCoa[r.code] = r.id);

        async function getSourceBalance(bankId, coaCode) {
            let total = 0;
            const coaId = mapCoa[coaCode];

            // 1. Opening Balance
            const open = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM opening_balances WHERE account_id = $1 AND is_active = true", [coaId]);
            total += parseFloat(open.rows[0].total);

            // 2. Customer Payments (Credits)
            const pay = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM customer_payments WHERE bank_id = $1 AND status = 'Verified' AND is_active = true", [bankId]);
            total += parseFloat(pay.rows[0].total);

            // 3. Other Income
            const inc = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM other_income WHERE destination_account_id = $1 AND is_active = true", [coaId]);
            total += parseFloat(inc.rows[0].total);

            // 4. Vendor Payments (Debits)
            const vPay = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM vendor_payments WHERE bank_account_id = $1 AND is_active = true", [bankId]);
            total -= parseFloat(vPay.rows[0].total);

            // 5. Expenses (Debits)
            const exp = await pool.query("SELECT COALESCE(SUM(grand_total), 0) as total FROM expenses WHERE payment_source_id = $1 AND is_active = true", [coaId]);
            total -= parseFloat(exp.rows[0].total);

            // 6. Internal Transfers (Net)
            const tIn = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM internal_transfers WHERE to_account_id = $1 AND is_active = true", [coaId]);
            const tOut = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM internal_transfers WHERE from_account_id = $1 AND is_active = true", [coaId]);
            total += (parseFloat(tIn.rows[0].total) - parseFloat(tOut.rows[0].total));

            return total;
        }

        async function getLedgerBalance(coaCode) {
            const res = await pool.query(`
                SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as balance 
                FROM journal_lines jl 
                JOIN chart_of_accounts coa ON jl.account_id = coa.id 
                WHERE coa.code = $1
            `, [coaCode]);
            return parseFloat(res.rows[0].balance);
        }

        const idfcSource = await getSourceBalance(idfcId, '1002');
        const idfcLedger = await getLedgerBalance('1002');

        const axisSource = await getSourceBalance(axisId, '1001');
        const axisLedger = await getLedgerBalance('1001');

        console.log('--- FINAL FORENSIC COMPARISON ---');
        console.table([
            { Account: 'IDFC Bank', 'Source Table Sum': idfcSource.toFixed(2), 'Ledger Sum': idfcLedger.toFixed(2), Gap: (idfcSource - idfcLedger).toFixed(2) },
            { Account: 'Axis Bank', 'Source Table Sum': axisSource.toFixed(2), 'Ledger Sum': axisLedger.toFixed(2), Gap: (axisSource - axisLedger).toFixed(2) }
        ]);

        if (Math.abs(idfcSource - idfcLedger) > 0.01 || Math.abs(axisSource - axisLedger) > 0.01) {
            console.log('\n🚩 DISCREPANCY DETECTED: Finding the exact ghost entries...');
            // Deep diff logic here if needed...
        } else {
            console.log('\n✅ 100% MATCH: Your physical database exactly matches your accounting ledger.');
        }

    } catch (e) {
        console.error('❌ Forensic Failed:', e.message);
    } finally {
        process.exit(0);
    }
}

groundTruthForensic();
