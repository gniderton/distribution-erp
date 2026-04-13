const { pool } = require('./config/db');

async function runVaultAudit() {
    const modules = [
        { name: 'Other Income', table: 'other_income', type: 'OTHER_INC' },
        { name: 'Expenses', table: 'expenses', type: 'EXPENSE' },
        { name: 'Debit Notes', table: 'debit_notes', type: 'DEBIT_NOTE' },
        { name: 'Sales Invoices', table: 'sales_invoices', type: 'SALES_INV' },
        { name: 'Sales Returns', table: 'sales_returns', type: 'SALES_RET' },
        { name: 'Customer Payments', table: 'customer_payments', type: 'CUST_PAY' },
        { name: 'Purchase Invoices', table: 'purchase_invoice_headers', type: 'PURCH_INV' },
        { name: 'Vendor Payments', table: 'vendor_payments', type: 'PAYMENT' },
        { name: 'Internal Transfers', table: 'internal_transfers', type: 'TRANSFER' },
        { name: 'Loan Transactions', table: 'loan_transactions', type: 'LOAN_TRX' },
        { name: 'Stock Adjustments', table: 'stock_adjustments', type: 'STK_ADJ' },
        { name: 'Asset Transactions', table: 'asset_transactions', type: 'ASSET_TRX' },
        { name: 'Employee Salaries', table: 'employee_salaries', type: 'SALARY' },
        { name: 'Employee Advances', table: 'employee_advances', type: 'EMP_ADV' }
    ];

    const report = [];

    console.log('🚀 Starting Global Transaction Vault Audit (Separated Fetch Strategy)...');

    for (const mod of modules) {
        try {
            // Fetch all IDs from Module Table as strings
            const tableData = await pool.query(`SELECT id::text FROM ${mod.table}`);
            const tableIds = new Set(tableData.rows.map(r => r.id));

            // Fetch all Reference IDs from Journal Entries for this module
            const ledgerData = await pool.query(`SELECT reference_id FROM journal_entries WHERE reference_type = $1 AND reference_id IS NOT NULL`, [mod.type]);
            const ledgerIds = new Set(ledgerData.rows.map(r => r.reference_id));

            // 1. Missing in Ledger (In Table, but not in Ledger)
            const missing = [...tableIds].filter(id => !ledgerIds.has(id));

            // 2. Orphans (In Ledger, but not in Table)
            // Filter to only consider numeric-looking reference_ids to avoid non-transactional junk
            const orphans = [...ledgerIds].filter(id => id.match(/^[0-9]+$/) && !tableIds.has(id));

            if (missing.length > 0 || orphans.length > 0) {
                // Fetch basic info for missing records
                let missingDetails = [];
                if (missing.length > 0) {
                    const sampleMissing = missing.slice(0, 5);
                    const details = await pool.query(`SELECT id, created_at FROM ${mod.table} WHERE id::text IN (${sampleMissing.map(id => `'${id}'`).join(',')})`);
                    missingDetails = details.rows;
                }

                // Fetch basic info for orphan entries
                let orphanDetails = [];
                if (orphans.length > 0) {
                    const sampleOrphans = orphans.slice(0, 5);
                    const details = await pool.query(`SELECT id, description, reference_id FROM journal_entries WHERE reference_type = $1 AND reference_id IN (${sampleOrphans.map(id => `'${id}'`).join(',')})`, [mod.type]);
                    orphanDetails = details.rows;
                }

                report.push({
                    module: mod.name,
                    missing_count: missing.length,
                    missing_samples: missingDetails,
                    orphan_count: orphans.length,
                    orphan_samples: orphanDetails
                });
            }
        } catch (err) {
            console.error(`❌ Error auditing ${mod.name}:`, err.message);
        }
    }

    console.log('\n--- 🏛️ FINAL AUDIT REPORT ---');
    if (report.length === 0) {
        console.log('✅ ALL SYSTEMS SECURE: Ledger matches 100% of Transactions.');
    } else {
        report.forEach(r => {
            console.log(`\n📦 Module: ${r.module}`);
            if (r.missing_count > 0) {
                console.log(`  🚩 Missing from Ledger: ${r.missing_count} records`);
                r.missing_samples.forEach(m => console.log(`     - ID: ${m.id} (${m.created_at})`));
                if (r.missing_count > 5) console.log(`     ... and ${r.missing_count - 5} more`);
            }
            if (r.orphan_count > 0) {
                console.log(`  👻 Orphaned (Ghosts): ${r.orphan_count} entries`);
                r.orphan_samples.forEach(o => console.log(`     - JE ID: ${o.id} | Ref: ${o.reference_id} | ${o.description}`));
                if (r.orphan_count > 5) console.log(`     ... and ${r.orphan_count - 5} more`);
            }
        });
    }
}

runVaultAudit().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
