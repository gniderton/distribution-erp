const { pool } = require('./config/db');

async function backfillJournalSources() {
    try {
        console.log('🚀 Starting Robust Backfill (V3)...');

        // Using separate cast and CASE logic to avoid bigint~unknown operator error
        const updateQuery = `
            UPDATE journal_entries 
            SET 
                source_table = CASE 
                    WHEN reference_type = 'SALES_INV' THEN 'sales_invoices'
                    WHEN reference_type = 'CUST_PAY' THEN 'customer_payments'
                    WHEN reference_type = 'EXPENSE' THEN 'expenses'
                    WHEN reference_type = 'TRX_INCOME' THEN 'other_income'
                    WHEN reference_type = 'PURCH_INV' THEN 'purchase_invoice_headers'
                    WHEN reference_type = 'PAYMENT' THEN 'vendor_payments'
                    WHEN reference_type = 'OPENING_BAL' THEN 'opening_balances'
                    WHEN reference_type = 'TRANSFER' THEN 'internal_transfers'
                    WHEN reference_type = 'LOAN_TRX' THEN 'loan_transactions'
                    WHEN reference_type = 'STK_ADJ' THEN 'stock_adjustments'
                    WHEN reference_type = 'SALES_RET' THEN 'sales_returns'
                    WHEN reference_type = 'GRN' THEN 'purchase_inwards'
                    WHEN reference_type = 'COGS' THEN 'sales_invoice_lines'
                    ELSE source_table 
                END,
                source_id = CASE 
                    WHEN reference_id ~ '^[0-9]+$' THEN CAST(reference_id AS BIGINT)
                    ELSE source_id 
                END
            WHERE source_table IS NULL;
        `;

        const res = await pool.query(updateQuery);
        console.log(`✅ Backfill Complete: ${res.rowCount} records updated.`);

    } catch (err) {
        console.error('❌ Backfill Failed:', err.stack);
    } finally {
        process.exit(0);
    }
}

backfillJournalSources();
