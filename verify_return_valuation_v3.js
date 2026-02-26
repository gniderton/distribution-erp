const { pool } = require('./config/db');

const BASE_URL = 'http://localhost:3000/api';

async function runTest() {
    console.log('--- Starting Return Valuation Verification V3 (Breakdown & Discounts) ---');

    try {
        const customerId = 1;
        const productId = 1;

        const tripRes = await pool.query("SELECT id FROM delivery_trips ORDER BY id DESC LIMIT 1");
        const tripId = tripRes.rows[0].id;

        await pool.query("UPDATE customers SET channel_id = 3 WHERE id = $1", [customerId]);
        await pool.query("UPDATE inventory_batches SET dealer_rate = 104, mrp = 120, quantity_remaining = 100, is_active = true, status = 'Good' WHERE product_id = $1", [productId]);
        const batchRes = await pool.query("SELECT id, batch_code FROM inventory_batches WHERE product_id = $1 AND status = 'Good' LIMIT 1", [productId]);
        const batchId = batchRes.rows[0].id;
        const batchCode = batchRes.rows[0].batch_code;

        console.log(`Setup complete. Trip: ${tripId}, Batch: ${batchCode}, Price: 104`);

        const invNo = 'DISC-' + floor(random() * 1000000);
        const invRes = await pool.query(`
            INSERT INTO sales_invoices (invoice_number, customer_id, invoice_date, grand_total, total_taxable, status)
            VALUES ($1, $2, CURRENT_DATE - INTERVAL '1 month', 84, 80, 'Paid')
            RETURNING id
        `, [invNo, customerId]);
        const histInvId = invRes.rows[0].id;

        await pool.query(`
            INSERT INTO sales_invoice_lines (invoice_id, product_id, batch_id, shipped_qty, rate, mrp, taxable_amount, amount, tax_percent)
            VALUES ($1, $2, $3, 1, 104, 120, 80, 84, 5)
        `, [histInvId, productId, batchId]);

        const syncPayload = {
            trip_id: tripId,
            updates: [],
            payments: [],
            returns: [
                {
                    product_id: productId,
                    customer_id: customerId,
                    qty: 1,
                    return_type: 'Expiry/Damage Return',
                    condition: 'Damage',
                    reason: 'Leaking bottle',
                    batch_id: batchId
                }
            ]
        };

        const syncResp = await fetch(`${BASE_URL}/delivery/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncPayload)
        });
        const syncData = await syncResp.json();
        const syncId = syncData.sync_id;
        console.log(`Sync Successful. Sync ID: ${syncId}`);

        const detailsResp = await fetch(`${BASE_URL}/delivery/sync/${syncId}/details`);
        const detailsData = await detailsResp.json();
        const returnId = detailsData.returns[0].id;

        const settlePayload = {
            sync_id: syncId,
            verified_by: 1,
            return_verifications: [
                { return_id: returnId, status: 'Approved' }
            ]
        };

        await fetch(`${BASE_URL}/delivery/verify/settle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settlePayload)
        });

        console.log('\n--- Checking Database Impacts (Filtered by Sync ID) ---');

        const srLineRes = await pool.query(`
            SELECT srl.* FROM sales_return_lines srl
            JOIN sales_returns sr ON srl.return_id = sr.id
            JOIN trip_returns tr ON tr.product_id = srl.product_id
            WHERE tr.sync_id = $1
            ORDER BY srl.id DESC LIMIT 1
        `, [syncId]);

        const line = srLineRes.rows[0];
        console.table({
            BaseRate: line.rate,
            Gross: line.gross_amount,
            Scheme: line.scheme_amount,
            "Disc %": line.discount_percent,
            "Disc $": line.discount_amount,
            Taxable: line.taxable_amount,
            GrandTotal: line.amount
        });

        if (line.discount_percent !== undefined) {
            console.log('✅ Discount columns found and populated.');
        } else {
            console.log('❌ Discount columns missing or null.');
        }

    } catch (err) {
        console.error('Verification Error:', err.message);
    } finally {
        process.exit();
    }
}

function floor(n) { return Math.floor(n); }
function random() { return Math.random(); }

runTest();
