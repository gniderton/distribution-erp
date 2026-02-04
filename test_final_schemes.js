const { pool } = require('./config/db');
const { calculateFreeItems } = require('./utils/schemeEngine');

async function testAllSchemes() {
    const client = await pool.connect();
    try {
        console.log("🧪 Starting Comprehensive Scheme Test...");
        await client.query('BEGIN');

        // 1. Setup Data
        const v = await client.query("INSERT INTO vendors (vendor_name, vendor_code) VALUES ('Test Vendor', 'TV001') RETURNING id");
        const vid = v.rows[0].id;
        const b = await client.query("INSERT INTO brands (brand_name) VALUES ('Test Brand') RETURNING id");
        const bid = b.rows[0].id;
        const c = await client.query("INSERT INTO categories (category_name) VALUES ('Test Category') RETURNING id");
        const cid = c.rows[0].id;

        // Products
        const pA = await client.query("INSERT INTO products (product_name, product_code, brand_id, category_id, vendor_id, mrp, purchase_rate) VALUES ('Prod A (BGF)', 'PA001', $1, $2, $3, 100, 80) RETURNING id", [bid, cid, vid]);
        const pB = await client.query("INSERT INTO products (product_name, product_code, brand_id, category_id, vendor_id, mrp, purchase_rate) VALUES ('Prod B (Combo)', 'PB001', $1, $2, $3, 100, 80) RETURNING id", [bid, cid, vid]);
        const pC = await client.query("INSERT INTO products (product_name, product_code, brand_id, category_id, vendor_id, mrp, purchase_rate) VALUES ('Prod C (Slab)', 'PC001', $1, $2, $3, 100, 80) RETURNING id", [bid, cid, vid]);
        const idA = pA.rows[0].id;
        const idB = pB.rows[0].id;
        const idC = pC.rows[0].id;

        // Inventory
        await client.query("INSERT INTO inventory_batches (product_id, batch_code, quantity_remaining, purchase_rate, dealer_rate, is_active) VALUES ($1, 'BAT001', 1000, 80, 90, true)", [idA]);
        await client.query("INSERT INTO inventory_batches (product_id, batch_code, quantity_remaining, purchase_rate, dealer_rate, is_active) VALUES ($1, 'BAT002', 1000, 80, 90, true)", [idB]);
        await client.query("INSERT INTO inventory_batches (product_id, batch_code, quantity_remaining, purchase_rate, dealer_rate, is_active) VALUES ($1, 'BAT003', 1000, 80, 90, true)", [idC]);

        // 2. Schemes
        // A. BGF: Buy 10 Get 1 (Prod A)
        const sBGF = await client.query("INSERT INTO schemes (scheme_name, start_date, is_active) VALUES ('BGF Scheme', CURRENT_DATE, true) RETURNING id");
        await client.query(`INSERT INTO scheme_rules (scheme_id, scheme_type, min_qty, reward_qty, is_recursive, trigger_type, trigger_id) VALUES ($1, 'BUY_GET_FREE', 10, 1, true, 'Product', $2)`, [sBGF.rows[0].id, idA]);

        // B. Combo: Buy 24 of B Get 2 Free (Simplifying for test)
        const sCombo = await client.query("INSERT INTO schemes (scheme_name, start_date, is_active) VALUES ('Combo Scheme', CURRENT_DATE, true) RETURNING id");
        const rCombo = await client.query(`INSERT INTO scheme_rules (scheme_id, scheme_type, min_qty, reward_product_id, reward_qty, is_recursive, trigger_type, trigger_id) VALUES ($1, 'COMBO', 24, $2, 2, true, 'Product', NULL) RETURNING id`, [sCombo.rows[0].id, idB]);
        await client.query("INSERT INTO scheme_combo_products (scheme_rule_id, product_id) VALUES ($1, $2)", [rCombo.rows[0].id, idB]);

        // C. Price Slab: Buy 100 of C -> Price 75 (instead of 90)
        const sSlab = await client.query("INSERT INTO schemes (scheme_name, start_date, is_active) VALUES ('Slab Scheme', CURRENT_DATE, true) RETURNING id");
        await client.query(`INSERT INTO scheme_rules (scheme_id, scheme_type, min_qty, reward_qty, special_price, trigger_type, trigger_id) VALUES ($1, 'PRICE_SLAB', 100, 0, 75, 'Product', $2)`, [sSlab.rows[0].id, idC]);

        // 3. RUN ENGINE CHECK
        const input = [
            { product_id: idA, qty: 20 },  // Expect 2 Free (BGF)
            { product_id: idB, qty: 24 },  // Expect 2 Free (Combo)
            { product_id: idC, qty: 100 }  // Expect Rate 75 (Slab)
        ];

        console.log("🏃 Running Engine...");
        const result = await calculateFreeItems(input, null, client);

        console.log("📊 Results:");
        console.log("Free Items:", JSON.stringify(result.freeItems, null, 2));
        console.log("Price Slabs:", JSON.stringify(result.priceSlabs, null, 2));

        // Verifications
        const freeA = result.freeItems.find(f => f.product_id == idA);
        const freeB = result.freeItems.find(f => f.product_id == idB);
        const slabC = result.priceSlabs[idC];

        let failed = false;
        if (!freeA || freeA.qty !== 2) { console.error("❌ BGF Failed: Expected 2 free for A"); failed = true; }
        if (!freeB || freeB.qty !== 2) { console.error("❌ Combo Failed: Expected 2 free for B"); failed = true; }
        if (!slabC || slabC.special_price !== 75) { console.error("❌ Slab Failed: Expected rate 75 for C"); failed = true; }

        if (!failed) console.log("✅ ALL ENGINE TESTS PASSED!");

        await client.query('ROLLBACK');
    } catch (err) {
        console.error("💥 TEST CRASHED:", err);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        process.exit();
    }
}

testAllSchemes();
