const { pool } = require('../config/db');

async function testLedgerLogic(productId) {
    console.log(`--- Testing Ledger Logic for Product ${productId} ---`);
    try {
        // Mocking the API logic
        const prodRes = await pool.query('SELECT product_name, product_code FROM products WHERE id = $1', [productId]);
        const product = prodRes.rows[0];

        const query = `
            SELECT 
                st.created_at as date,
                st.transaction_type,
                st.quantity_change,
                st.reference_type,
                CASE 
                    WHEN st.reference_type = 'Sales Invoice' THEN (SELECT invoice_number FROM sales_invoices WHERE id = st.reference_id)
                    WHEN st.reference_type = 'Purchase Invoice' THEN (SELECT invoice_number FROM purchase_invoice_headers WHERE id = st.reference_id)
                    WHEN st.reference_type = 'Debit Note' THEN (SELECT debit_note_number FROM debit_notes WHERE id = st.reference_id)
                    WHEN st.reference_type = 'Sales Return' THEN (SELECT return_number FROM sales_returns WHERE id = st.reference_id)
                    ELSE 'Ref-' || st.reference_id
                END as ref_num
            FROM stock_traceability st
            WHERE st.product_id = $1
            ORDER BY st.created_at ASC, st.id ASC
        `;
        const res = await pool.query(query, [productId]);

        let balance = 0;
        const rows = res.rows.map(r => {
            balance += Number(r.quantity_change);
            return {
                Date: r.date.toISOString().split('T')[0],
                Type: r.transaction_type,
                Change: r.quantity_change,
                Ref: r.ref_num,
                Balance: balance
            };
        });

        console.log(`Product: ${product.product_name} (${product.product_code})`);
        console.table(rows);
    } catch (err) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}

testLedgerLogic(224);
