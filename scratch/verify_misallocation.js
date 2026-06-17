const { pool } = require('../config/db');

async function verify() {
    try {
        console.log('--- 1. VERIFYING PAYMENT 2013 ---');
        const payRes = await pool.query('SELECT id, customer_id, amount, payment_number, payment_date FROM customer_payments WHERE id = 2013');
        console.table(payRes.rows);

        console.log('\n--- 2. VERIFYING ALLOCATION 2221 ---');
        const allocRes = await pool.query('SELECT id, payment_id, invoice_id, amount, status FROM customer_payment_allocations WHERE id = 2221');
        console.table(allocRes.rows);

        console.log('\n--- 3. VERIFYING CURRENT WRONG INVOICE 1316 ---');
        const inv1316Res = await pool.query('SELECT id, invoice_number, customer_id, grand_total, paid_amount, balance_amount, status FROM sales_invoices WHERE id = 1316');
        console.table(inv1316Res.rows);

        console.log('\n--- 4. VERIFYING SUPPOSED CORRECT INVOICE 917 ---');
        const inv917Res = await pool.query('SELECT id, invoice_number, customer_id, grand_total, paid_amount, balance_amount, status FROM sales_invoices WHERE id = 917');
        console.table(inv917Res.rows);

        if (inv917Res.rows.length > 0) {
            const inv917 = inv917Res.rows[0];
            const pay = payRes.rows[0];
            console.log(`\nValidation: Invoice 917 belongs to Customer ${inv917.customer_id}. Payment is from Customer ${pay.customer_id}.`);
            if (inv917.customer_id == pay.customer_id) {
                console.log('✅ MATCH: Invoice 917 and Payment 2013 belong to the same customer.');
            } else {
                console.log('❌ MISMATCH: Invoice 917 belongs to a different customer than the payment!');
            }
        } else {
            console.log('❌ Invoice 917 not found!');
        }

    } catch (err) {
        console.error('Error during verification:', err.message);
    } finally {
        await pool.end();
    }
}

verify();
