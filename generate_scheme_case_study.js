const { pool } = require('./config/db');
const { calculateFreeItems } = require('./utils/schemeEngine');

async function generateCaseStudy() {
    const client = await pool.connect();
    try {
        console.log("🚀 Simulating Full Sales Cycle...");
        await client.query('BEGIN');

        // 1. Setup Infrastructure
        const chan = await client.query("INSERT INTO channels (channel_name, price_column) VALUES ('CaseStudy', 'dealer_rate') RETURNING id");
        const chanId = chan.rows[0].id;

        const cust = await client.query("INSERT INTO customers (customer_name, channel_id, customer_code) VALUES ('Ideal Retailer', $1, 'CUST-001') RETURNING id", [chanId]);
        const custId = cust.rows[0].id;

        const b = await client.query("INSERT INTO brands (brand_name) VALUES ('Premium Brand') RETURNING id");
        const bid = b.rows[0].id;

        const v = await client.query("INSERT INTO vendors (vendor_name, vendor_code) VALUES ('CaseStudy Vendor', 'CSV-001') RETURNING id");
        const vid = v.rows[0].id;

        // 2. Products & Stock
        const pA = await client.query("INSERT INTO products (product_name, product_code, brand_id, vendor_id, mrp, purchase_rate) VALUES ('Sauce A (BGF)', 'S-A', $1, $2, 100, 70) RETURNING id", [bid, vid]);
        const pB = await client.query("INSERT INTO products (product_name, product_code, brand_id, vendor_id, mrp, purchase_rate) VALUES ('Sauce B (Combo)', 'S-B', $1, $2, 100, 70) RETURNING id", [bid, vid]);
        const pC = await client.query("INSERT INTO products (product_name, product_code, brand_id, vendor_id, mrp, purchase_rate) VALUES ('Sauce C (Slab)', 'S-C', $1, $2, 100, 70) RETURNING id", [bid, vid]);
        const idA = pA.rows[0].id;
        const idB = pB.rows[0].id;
        const idC = pC.rows[0].id;

        await client.query("INSERT INTO inventory_batches (product_id, batch_code, quantity_remaining, purchase_rate, dealer_rate, is_active) VALUES ($1, 'B-001', 500, 70, 90, true)", [idA]);
        await client.query("INSERT INTO inventory_batches (product_id, batch_code, quantity_remaining, purchase_rate, dealer_rate, is_active) VALUES ($1, 'B-002', 500, 70, 90, true)", [idB]);
        await client.query("INSERT INTO inventory_batches (product_id, batch_code, quantity_remaining, purchase_rate, dealer_rate, is_active) VALUES ($1, 'B-003', 500, 70, 90, true)", [idC]);

        // 3. Schemes
        // BGF: Buy 10 Get 1
        const sBGF = await client.query("INSERT INTO schemes (scheme_name, start_date, is_active) VALUES ('Buy 10 Get 1 Free', CURRENT_DATE, true) RETURNING id");
        await client.query("INSERT INTO scheme_rules (scheme_id, scheme_type, min_qty, reward_qty, is_recursive, trigger_type, trigger_id) VALUES ($1, 'BUY_GET_FREE', 10, 1, true, 'Product', $2)", [sBGF.rows[0].id, idA]);

        // Combo: Sauce Basket (Buy 24 Mixed A+B Get 2 Free)
        const sCombo = await client.query("INSERT INTO schemes (scheme_name, start_date, is_active) VALUES ('Sauce Basket (Mixed 24)', CURRENT_DATE, true) RETURNING id");
        const rCombo = await client.query("INSERT INTO scheme_rules (scheme_id, scheme_type, min_qty, reward_product_id, reward_qty, is_recursive, trigger_type, trigger_id) VALUES ($1, 'COMBO', 24, $2, 1, true, 'Product', NULL) RETURNING id", [sCombo.rows[0].id, idB]);
        await client.query("INSERT INTO scheme_combo_products (scheme_rule_id, product_id) VALUES ($1, $2), ($1, $3)", [rCombo.rows[0].id, idA, idB]);

        // Slab: Buy 100+ -> Price 75
        const sSlab = await client.query("INSERT INTO schemes (scheme_name, start_date, is_active) VALUES ('Bulk Slab (100+)', CURRENT_DATE, true) RETURNING id");
        await client.query("INSERT INTO scheme_rules (scheme_id, scheme_type, min_qty, reward_qty, special_price, trigger_type, trigger_id) VALUES ($1, 'PRICE_SLAB', 100, 0, 75, 'Product', $2)", [sSlab.rows[0].id, idC]);

        // 4. THE SALES ORDER
        const so = await client.query("INSERT INTO sales_orders (customer_id, order_date, status, so_number) VALUES ($1, CURRENT_DATE, 'Confirmed', 'SO-CS-001') RETURNING id", [custId]);
        const soId = so.rows[0].id;

        // Items Ordered:
        // A: 20 units -> Should get 2 BGF
        // A+B: 24 units -> Should get 2 Combo (Wait, A is already used by BGF?)
        // Let's do:
        // A: 50 -> (Combo consumes portion, BGF takes remaining)
        // B: 24
        // C: 100
        await client.query("INSERT INTO sales_order_lines (sales_order_id, product_id, ordered_qty, rate) VALUES ($1, $2, 50, 90), ($1, $3, 24, 90), ($1, $4, 100, 90)", [soId, idA, idB, idC]);

        console.log("📋 Sales Order Created [ID: " + soId + "]");

        // 5. SIMULATE DISPATCH (logic from routes/sales.js)
        const linesRes = await client.query("SELECT * FROM sales_order_lines WHERE sales_order_id = $1", [soId]);
        const shippedMap = {};
        linesRes.rows.forEach(l => shippedMap[l.product_id] = l.ordered_qty);

        // SCHEME ENGINE
        const input = Object.entries(shippedMap).map(([pid, qty]) => ({ product_id: Number(pid), qty: Number(qty) }));
        const { freeItems, priceSlabs } = await calculateFreeItems(input, custId, client);

        console.log("🎁 Schemes Identified:");
        console.log("Free Items:", freeItems.map(f => `${f.qty}x PID ${f.product_id} (${f.reason})`));
        console.log("Slabs:", Object.entries(priceSlabs).map(([pid, s]) => `PID ${pid}: New Price ${s.special_price}`));

        // 6. FINAL INVOICE BREAKDOWN (Simulated Result)
        console.log("\n--- FINAL INVOICE BREAKDOWN ---");
        console.log("| Product | Ordered | Free | Total Shipped | Unit Rate | Gross | Scheme Amt | Taxable | Tax (18%) | Net |");
        console.log("|---------|---------|------|---------------|-----------|-------|------------|---------|-----------|-----|");

        let totalInvoice = 0;

        for (const line of linesRes.rows) {
            const pid = line.product_id;
            const freeItem = freeItems.find(f => f.product_id == pid);
            const freeQty = freeItem ? freeItem.qty : 0;
            const totalQty = Number(line.ordered_qty) + freeQty;
            const taxPct = 18;

            const unitRate = 90.00; // Dealer Rate (Excl Tax)

            let slabDeduction = 0;
            if (priceSlabs[pid]) {
                const targetNet = Number(priceSlabs[pid].special_price);
                const targetExcl = targetNet / (1 + (taxPct / 100));
                slabDeduction = (totalQty * (unitRate - targetExcl));
            }

            const gross = totalQty * unitRate;
            const freeValue = freeQty * unitRate;
            const schemeAmt = freeValue + slabDeduction;

            const taxable = gross - schemeAmt;
            const tax = taxable * (taxPct / 100);
            const net = taxable + tax;
            totalInvoice += net;

            const pName = (pid == idA) ? "Sauce A" : (pid == idB) ? "Sauce B" : (pid == idC) ? "Sauce C" : `PID ${pid}`;

            console.log(`| ${pName} | ${line.ordered_qty} | ${freeQty} | ${totalQty} | ${unitRate.toFixed(2)} | ${gross.toFixed(2)} | ${schemeAmt.toFixed(2)} | ${taxable.toFixed(2)} | ${tax.toFixed(2)} | ${net.toFixed(2)} |`);
        }
        console.log("\nTOTAL PAYABLE: " + totalInvoice.toFixed(2));

        await client.query('ROLLBACK');
    } catch (err) {
        console.error(err);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        process.exit();
    }
}

generateCaseStudy();
