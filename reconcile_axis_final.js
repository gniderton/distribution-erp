const { pool } = require('./config/db');

async function compareAxis() {
    try {
        console.log('🕵️ AXIS FORENSIC RECONCILIATION: STATEMENT vs OPERATIONS\n');

        // 1. Get Physical Bank Statement Truth
        const stmtRes = await pool.query(`
            SELECT 
                COUNT(*) as line_count,
                COALESCE(SUM(credit_amount), 0) as total_in,
                COALESCE(SUM(debit_amount), 0) as total_out,
                COALESCE(SUM(credit_amount - debit_amount), 0) as net
            FROM bank_statement_entries 
            WHERE bank_account_id = 2
        `);
        console.log('🏛️ PHYSICAL BANK STATEMENT (bank_statement_entries)');
        console.table(stmtRes.rows);

        // 2. Get Operational Claims (What hits Axis Bank ID 2)
        const opRes = await pool.query(`
            WITH source_data AS (
                SELECT id, amount as inflow, 0 as outflow, 'Customer' as src FROM customer_payments WHERE bank_id = 2 AND is_active = true
                UNION ALL
                SELECT id, 0, amount, 'Vendor' FROM vendor_payments WHERE bank_account_id = 2
                UNION ALL
                SELECT id, 0, grand_total, 'Expense' FROM expenses WHERE payment_source_id = 2
                UNION ALL
                SELECT id, amount, 0, 'Transfer (In)' FROM internal_transfers WHERE to_account_id = 2
                UNION ALL
                SELECT id, 0, amount, 'Transfer (Out)' FROM internal_transfers WHERE from_account_id = 2
                UNION ALL
                SELECT id, (CASE WHEN transaction_type = 'DISBURSEMENT' THEN amount ELSE 0 END), 
                       (CASE WHEN transaction_type = 'INSTALLMENT' THEN amount ELSE 0 END), 'Loan'
                FROM loan_transactions WHERE bank_statement_entry_id IS NULL AND loan_id IN (SELECT id FROM loans)
            )
            SELECT 
                COUNT(*) as line_count,
                COALESCE(SUM(inflow), 0) as total_in,
                COALESCE(SUM(outflow), 0) as total_out,
                COALESCE(SUM(inflow - outflow), 0) as net
            FROM source_data
        `);
        console.log('\n📊 OPERATIONAL LEDGER (Operational Tables)');
        console.table(opRes.rows);

        // 3. Pinpoint specific "Ghost Inflows" in operations
        const ghostRes = await pool.query(`
            SELECT 'Loan' as type, transaction_type, amount, transaction_date 
            FROM loan_transactions 
            WHERE bank_id = 2 -- Or wherever Axis is mapped
            OR loan_id IN (SELECT id FROM loans) -- Just to check
            LIMIT 10
        `);
        console.log('\n⚠️ POTENTIAL POLLUTANTS (Transactions mapped to Axis but maybe shouldn\'t be)');
        console.table(ghostRes.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

compareAxis();
