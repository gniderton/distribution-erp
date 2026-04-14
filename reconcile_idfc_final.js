const { pool } = require('./config/db');

async function compareIDFC() {
    try {
        console.log('🕵️ IDFC FORENSIC RECONCILIATION: STATEMENT vs OPERATIONS\n');

        // 1. Get Physical Bank Statement Truth (Bank ID 3)
        const stmtRes = await pool.query(`
            SELECT 
                COUNT(*) as line_count,
                COALESCE(SUM(credit_amount), 0) as total_in,
                COALESCE(SUM(debit_amount), 0) as total_out,
                COALESCE(SUM(credit_amount - debit_amount), 0) as net
            FROM bank_statement_entries 
            WHERE bank_account_id = 3
        `);
        console.log('🏛️ IDFC PHYSICAL STATEMENT (bank_statement_entries)');
        console.table(stmtRes.rows);

        // 2. Get Operational Claims (What hits IDFC Bank ID 3)
        const opRes = await pool.query(`
            WITH source_data AS (
                SELECT id, amount as inflow, 0 as outflow, 'Customer' as src FROM customer_payments WHERE bank_id = 3 AND is_active = true
                UNION ALL
                SELECT id, 0, amount, 'Vendor' FROM vendor_payments WHERE bank_account_id = 3
                UNION ALL
                SELECT id, 0, grand_total, 'Expense' FROM expenses WHERE payment_source_id = 3
                UNION ALL
                SELECT id, amount, 0, 'Transfer (In)' FROM internal_transfers WHERE to_account_id = 3
                UNION ALL
                SELECT id, 0, amount, 'Transfer (Out)' FROM internal_transfers WHERE from_account_id = 3
                UNION ALL
                -- Since we don't have bank_id on loan_transactions directly (it uses coa),
                -- we check for bank_account_id = 3 if it exists in the journal bridge
                SELECT id, (CASE WHEN transaction_type = 'DISBURSEMENT' THEN amount ELSE 0 END), 
                       (CASE WHEN transaction_type = 'INSTALLMENT' THEN amount ELSE 0 END), 'Loan'
                FROM loan_transactions WHERE loan_id IN (SELECT id FROM loans)
                -- (Note: I'll check which of these hit IDFC coa specifically in the next step)
            )
            SELECT 
                COUNT(*) as line_count,
                COALESCE(SUM(inflow), 0) as total_in,
                COALESCE(SUM(outflow), 0) as total_out,
                COALESCE(SUM(inflow - outflow), 0) as net
            FROM source_data
        `);
        console.log('\n📊 IDFC OPERATIONAL LEDGER (Operational Tables)');
        console.table(opRes.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

compareIDFC();
