/**
 * Verification Script for Bank Reconciliation & Auto-Verification
 */

const { pool } = require('./config/db');

async function testRecon() {
    const baseUrl = 'http://localhost:3000/api/finance/reconciliation';

    try {
        console.log('--- Phase 1: Upload Bank Statement ---');
        const axisCSV = `S.No,Transaction Date (dd/mm/yyyy),Value Date (dd/mm/yyyy),Particulars,Amount(INR),Debit/Credit,Balance(INR),Cheque Number,Branch Name(SOL)
1,06/02/2026,06/02/2026,UPI/CR/123639800000/TEST USER/UBIN/test/UPI,"	10,000.00",CR,"10,000.00",,"CALICUT"`;

        const uploadRes = await fetch(`${baseUrl}/bank/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: axisCSV,
                bank_type: 'Axis'
            })
        });
        const uploadData = await uploadRes.json();
        console.log('Upload Result:', uploadData);

        console.log('\n--- Phase 2: Create Pending NEFT Payment (Simulating DSE Sync) ---');

        // Find a customer and a DSE
        const cust = await pool.query('SELECT id FROM customers LIMIT 1');
        const dse = await pool.query('SELECT id FROM employees LIMIT 1');
        const custId = cust.rows[0].id;
        const dseId = dse.rows[0].id;

        // Insert 3 payments with same Ref ID
        const p1 = await pool.query(`
            INSERT INTO customer_payments (customer_id, collected_by, amount, payment_mode, transaction_ref, payment_date)
            VALUES ($1, $2, 3600, 'NEFT', '123639800000', '2026-02-06') RETURNING id
        `, [custId, dseId]);

        const p2 = await pool.query(`
            INSERT INTO customer_payments (customer_id, collected_by, amount, payment_mode, transaction_ref, payment_date)
            VALUES ($1, $2, 4596, 'NEFT', '123639800000', '2026-02-06') RETURNING id
        `, [custId, dseId]);

        const p3 = await pool.query(`
            INSERT INTO customer_payments (customer_id, collected_by, amount, payment_mode, transaction_ref, payment_date)
            VALUES ($1, $2, 1804, 'NEFT', '123639800000', '2026-02-06') RETURNING id
        `, [custId, dseId]);

        // Create a DSR if doesn't exist
        await pool.query(`
            INSERT INTO daily_sales_reports (dse_id, report_date, total_collection_online, settlement_status)
            VALUES ($1, '2026-02-06', 10000, 'Pending')
            ON CONFLICT (dse_id, report_date) DO UPDATE SET settlement_status = 'Pending'
        `, [dseId]);

        const dsrRes = await pool.query('SELECT id FROM daily_sales_reports WHERE dse_id = $1 AND report_date = $2', [dseId, '2026-02-06']);
        const reportId = dsrRes.rows[0].id;

        console.log('Created 3 payments totaling 10,000 for DSR:', reportId);

        console.log('\n--- Phase 3: Run Auto-Verify ---');
        const autoVerifyRes = await fetch(`${baseUrl}/${reportId}/auto-verify-online`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 1 })
        });
        const autoVerifyData = await autoVerifyRes.json();
        console.log('Auto-Verify Result:', autoVerifyData);

        console.log('\n--- Phase 4: Check Results ---');
        const checkPayments = await pool.query('SELECT id, amount, verification_status FROM customer_payments WHERE id IN ($1, $2, $3)', [p1.rows[0].id, p2.rows[0].id, p3.rows[0].id]);
        console.log('Payment Statuses:', checkPayments.rows);

        const checkBSE = await pool.query('SELECT consumed_amount, status FROM bank_statement_entries WHERE bank_ref_id = $1', ['123639800000']);
        console.log('Bank Entry Status:', checkBSE.rows[0]);

        // Cleanup
        // await pool.query('DELETE FROM customer_payments WHERE id IN ($1, $2, $3)', [p1.rows[0].id, p2.rows[0].id, p3.rows[0].id]);
        // await pool.query('DELETE FROM bank_statement_entries WHERE bank_ref_id = $1', ['123639800000']);

        process.exit(0);

    } catch (err) {
        console.error('Test Failed:', err);
        process.exit(1);
    }
}

testRecon();
