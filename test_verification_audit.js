const { pool } = require('./config/db');

async function testVerification() {
    try {
        console.log('--- TESTING ADVANCED VERIFICATION FLOW ---');

        // 1. Create a Test Report & Associated Payments
        // Using existing DSE (Habeeb R... ID 1) and Customer (688) from logs
        const dseId = 1;
        const custId = 688;
        const reportDate = '2026-02-06';

        // Clean up any old test data for this date/DSE if needed
        await pool.query('DELETE FROM customer_payments WHERE payment_date = $1 AND collected_by = $2', [reportDate, dseId]);

        // A. Insert Cash Payment (5000)
        const cashRes = await pool.query(`
            INSERT INTO customer_payments (customer_id, collected_by, amount, payment_mode, payment_date, verification_status)
            VALUES ($1, $2, 5000, 'Cash', $3, 'Pending') RETURNING id
        `, [custId, dseId, reportDate]);
        const cashId = cashRes.rows[0].id;

        // B. Insert Cheque Payment (6431)
        const chequeRes = await pool.query(`
            INSERT INTO customer_payments (customer_id, collected_by, amount, payment_mode, payment_date, verification_status)
            VALUES ($1, $2, 6431, 'Cheque', $3, 'Pending') RETURNING id
        `, [custId, dseId, reportDate]);
        const chequeId = chequeRes.rows[0].id;

        // C. Create/Get Report
        const reportRes = await pool.query(`
            INSERT INTO daily_sales_reports (dse_id, report_date, settlement_status)
            VALUES ($1, $2, 'Pending')
            ON CONFLICT (dse_id, report_date) DO UPDATE SET settlement_status = 'Pending'
            RETURNING id
        `, [dseId, reportDate]);
        const reportId = reportRes.rows[0].id;

        console.log(`Created Report ID: ${reportId}, Cash ID: ${cashId}, Cheque ID: ${chequeId}`);

        // 2. Test Finalize Gate (Should FAIL because payments are Pending)
        console.log('\n>> Testing Finalize Gate (Should Fail)...');
        try {
            const res = await fetch(`http://localhost:3000/api/dse/reports/${reportId}/finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settled_by: 1 })
            });
            const data = await res.json();
            if (res.status === 400) {
                console.log('✅ Correctly blocked finalization. Error:', data.error);
            } else {
                console.log('❌ Error: Report finalized despite pending payments!', data);
            }
        } catch (e) { console.log('Fetch error (Server might not be running):', e.message); }

        // 3. Test Cash Verification (Wrong Math -> Should Fail)
        console.log('\n>> Testing Cash Verification (Wrong Denominations)...');
        try {
            const res = await fetch(`http://localhost:3000/api/payments/${cashId}/verify-cash`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    denominations: { 500: 9 }, // 4500 (Wrong, should be 5000)
                    verified_by: 1
                })
            });
            const data = await res.json();
            if (res.status === 400) {
                console.log('✅ Correctly blocked mismatch math. Error:', data.error);
            } else {
                console.log('❌ Error: Accepted wrong math!');
            }
        } catch (e) { }

        // 4. Test Cash Verification (Correct Math -> Should Pass)
        console.log('\n>> Testing Cash Verification (Correct Denominations)...');
        try {
            const res = await fetch(`http://localhost:3000/api/payments/${cashId}/verify-cash`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    denominations: { 500: 10 }, // 5000 (Correct)
                    verified_by: 1
                })
            });
            if (res.ok) console.log('✅ Cash Verified successfully!');
            else console.log('❌ Failed to verify cash');
        } catch (e) { }

        // 5. Test Cheque Verification
        console.log('\n>> Testing Cheque Image Verification...');
        try {
            const res = await fetch(`http://localhost:3000/api/payments/${chequeId}/verify-cheque`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cheque_image_url: 'https://example.com/chq_123.jpg',
                    verified_by: 1
                })
            });
            if (res.ok) console.log('✅ Cheque Verified successfully!');
            else console.log('❌ Failed to verify cheque');
        } catch (e) { }

        // 6. Test Online Verification
        console.log('\n>> Testing Online Verification (Bank Matching)...');
        try {
            // A. Insert Dummy Bank Entry
            const refId = 'REF-' + Date.now();
            await pool.query(`
                INSERT INTO bank_statement_entries (transaction_date, particulars, bank_ref_id, credit_amount, amount, status)
                VALUES ($1, $2, $3, 1000, 1000, 'Available')
            `, [reportDate, 'TEST ONLINE PAY ' + Date.now(), refId]);

            // B. Create Online Payment with matching Ref
            const onlineRes = await pool.query(`
                INSERT INTO customer_payments (customer_id, collected_by, amount, payment_mode, payment_date, transaction_ref, verification_status)
                VALUES ($1, $2, 1000, 'UPI', $3, $4, 'Pending') RETURNING id
            `, [custId, dseId, reportDate, refId]);
            const onlineId = onlineRes.rows[0].id;

            // C. Call verify-online
            const res = await fetch(`http://localhost:3000/api/payments/${onlineId}/verify-online`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ verified_by: 1 })
            });

            if (res.ok) {
                const data = await res.json();
                console.log('✅ Online payment verified & matched to bank entry ID:', data.matched_bank_id);
            } else {
                const errData = await res.json();
                console.log('❌ Failed to verify online payment:', errData.error);
            }
        } catch (e) { console.log('Online verify test failed:', e.message); }

        // 7. Test Finalize Gate (Should PASS now)
        console.log('\n>> Testing Finalize Gate (Should Pass now)...');
        try {
            const res = await fetch(`http://localhost:3000/api/dse/reports/${reportId}/finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settled_by: 1 })
            });
            if (res.ok) console.log('✅ Report Finalized successfully!');
            else console.log('❌ Failed to finalize report');
        } catch (e) { }

        console.log('\n--- VERIFICATION COMPLETE ---');
        process.exit();

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testVerification();
