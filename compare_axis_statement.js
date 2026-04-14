const { pool } = require('./config/db');

async function compareAxis() {
    try {
        console.log('🕵️ AXIS FORENSIC COMPARISON: BANK STATEMENT vs OPERATIONS\n');

        // 1. Get Physical Bank Statement Summary (The Ground Truth)
        const stmtRes = await pool.query(`
            SELECT 
                COUNT(*) as count,
                SUM(deposit) as total_in,
                SUM(withdrawal) as total_out,
                SUM(deposit - withdrawal) as net
            FROM bank_statement_entries 
            WHERE bank_account_id = 2
        `);
        console.log('🏛️ PHYSICAL BANK STATEMENT (bank_statement_entries)');
        console.table(stmtRes.rows);

        // 2. Get Operational Summary (What I showed in the Dashboard)
        const opRes = await pool.query(`
            WITH source_data AS (
                -- Simplified version of the UNION ALL query for Axis (bank_id = 2)
                SELECT amount as inflow, 0 as outflow, 'Customer' as src FROM customer_payments WHERE bank_id = 2
                UNION ALL
                SELECT 0, amount, 'Vendor' FROM vendor_payments WHERE bank_account_id = 2
                UNION ALL
                SELECT 0, grand_total, 'Expense' FROM expenses WHERE payment_source_id = 2
                UNION ALL
                SELECT amount, 0, 'Transfer' FROM internal_transfers WHERE to_account_id = 2
                UNION ALL
                SELECT 0, amount, 'Transfer' FROM internal_transfers WHERE from_account_id = 2
                UNION ALL
                SELECT (CASE WHEN transaction_type = 'DISBURSEMENT' THEN amount ELSE 0 END), 
                       (CASE WHEN transaction_type = 'INSTALLMENT' THEN amount ELSE 0 END), 'Loan'
                FROM loan_transactions WHERE loan_id IN (SELECT id FROM loans) -- Simplified check
            )
            SELECT 
                COUNT(*) as count,
                SUM(inflow) as total_in,
                SUM(outflow) as total_out,
                SUM(inflow - outflow) as net
            FROM source_data
        `);
        console.log('\n📊 OPERATIONAL LEDGER (Operational Tables)');
        console.table(opRes.rows);

        // 3. Find specific Operational entries that are NOT linked to a bank statement entry
        const gapRes = await pool.query(`
            SELECT 'Loan' as type, transaction_type, amount, transaction_date 
            FROM loan_transactions 
            WHERE bank_statement_entry_id IS NULL
            AND loan_id IN (SELECT id FROM loans)
            LIMIT 10
        `);
        console.log('\n⚠️ UNLINKED TRANSACTIONS (Operational Only, Missing from Statement)');
        console.table(gapRes.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

compareAxis();
