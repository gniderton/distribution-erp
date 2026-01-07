const { pool } = require('../config/db');

async function testDirectInsert() {
    console.log("--- TESTING DIRECT DB INSERT (Bypassing API) ---");

    try {
        // 1. Valid Vendor ID? (Change if needed)
        const VENDOR_ID = 7;

        // 2. Product ID? (Change if needed)
        const PRODUCT_ID = 160;

        console.log(`Using Vendor: ${VENDOR_ID}, Product: ${PRODUCT_ID}`);

        const payload = {
            vendor_id: VENDOR_ID,
            purchase_order_id: null,
            invoice_number: "DIRECT-TEST-" + Date.now(),
            invoice_date: new Date(),
            received_date: new Date(),
            total_net: 100,
            tax_amount: 5,
            grand_total: 105,
            lines: [
                {
                    product_id: PRODUCT_ID,
                    ordered_qty: 0,
                    accepted_qty: 10,
                    rejected_qty: 0,
                    rate: 10,
                    discount_percent: 0,
                    scheme_amount: 0,
                    tax_amount: 5,
                    amount: 105,
                    batch_number: "DIRECT-BATCH",
                    expiry_date: null,
                    mrp: 20,
                    sale_rate: 0
                }
            ]
        };

        console.log("Payload:", JSON.stringify(payload, null, 2));

        // CALL RPC DIRECTLY
        const query = `
            SELECT create_purchase_invoice(
                $1, $2, $3, $4, $5, $6, $7, $8, $9
            ) as response
        `;

        const values = [
            payload.vendor_id,
            payload.purchase_order_id,
            payload.invoice_number,
            payload.invoice_date,
            payload.received_date,
            payload.total_net,
            payload.tax_amount,
            payload.grand_total,
            JSON.stringify(payload.lines)
        ];

        const res = await pool.query(query, values);
        console.log("✅ SUCCESS! Response:", res.rows[0].response);

    } catch (err) {
        console.error("❌ FAILED:", err.message);
        if (err.detail) console.error("Detail:", err.detail);
        if (err.hint) console.error("Hint:", err.hint);
    } finally {
        pool.end();
    }
}

testDirectInsert();
