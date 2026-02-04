const { calculateFreeItems } = require('./utils/schemeEngine');
const { pool } = require('./config/db');

async function testComboLogic() {
    const client = await pool.connect();
    try {
        console.log('🧪 Starting Combo Logic Test...');
        await client.query('BEGIN');

        // 0. Fetch Valid Refs
        const vRes = await client.query("SELECT id FROM vendors LIMIT 1");
        const bRes = await client.query("SELECT id FROM brands LIMIT 1"); // Query brands, not product_brands
        const cRes = await client.query("SELECT id FROM categories LIMIT 1"); // Query categories, not product_categories
        const vid = vRes.rows[0].id;
        const bid = bRes.rows[0].id; // Needed for Brand Logic
        const cid = cRes.rows[0].id;

        // 1. Setup Mock Products
        console.log('📦 Creating Mock Products...');
        const pA = await client.query("INSERT INTO products (product_name, product_code, vendor_id, brand_id, category_id, mrp, purchase_rate) VALUES ('Test A', 'TA001', $1, $2, $3, 100, 80) RETURNING id", [vid, bid, cid]);
        const pB = await client.query("INSERT INTO products (product_name, product_code, vendor_id, brand_id, category_id, mrp, purchase_rate) VALUES ('Test B', 'TB001', $1, $2, $3, 100, 80) RETURNING id", [vid, bid, cid]);
        const pC = await client.query("INSERT INTO products (product_name, product_code, vendor_id, brand_id, category_id, mrp, purchase_rate) VALUES ('Test C', 'TC001', $1, $2, $3, 100, 80) RETURNING id", [vid, bid, cid]);
        const idA = pA.rows[0].id;
        const idB = pB.rows[0].id;
        const idC = pC.rows[0].id;

        // 2. Setup Schemes
        console.log('🎁 Creating Schemes...');

        // Header
        const sCombo = await client.query("INSERT INTO schemes (scheme_name, start_date, is_active) VALUES ('Sauce Basket', CURRENT_DATE, true) RETURNING id");
        const sidCombo = sCombo.rows[0].id;

        // Rule (Defines Type & Reward)
        const rCombo = await client.query(`
            INSERT INTO scheme_rules (scheme_id, scheme_type, min_qty, reward_product_id, reward_qty, is_recursive, channel_tier, trigger_type, trigger_id)
            VALUES ($1, 'COMBO', 24, $2, 2, true, 'Dealer', 'Product', NULL) -- trigger_id MUST be NULL for COMBO
            RETURNING id
        `, [sidCombo, idC]);
        const rid = rCombo.rows[0].id;

        // Combo Bucket (Links to Rule)
        await client.query("INSERT INTO scheme_combo_products (scheme_rule_id, product_id) VALUES ($1, $2)", [rid, idA]);
        await client.query("INSERT INTO scheme_combo_products (scheme_rule_id, product_id) VALUES ($1, $2)", [rid, idB]);

        // 3. Test Scenario
        // Order: 12 A, 12 B. Total Basket = 24.
        // Expect: 1 Multiplier (24/24). Reward = 2 C.

        console.log('📝 Running Basket Check (12 A + 12 B)...');
        const items = [
            { product_id: idA, qty: 12 },
            { product_id: idB, qty: 12 }
        ];

        // Need a customer ID for default tier 'Dealer' or mock it.
        // Fetch Channel ID for Dealer
        const chanRes = await client.query("SELECT id FROM channels WHERE channel_name = 'Dealer' LIMIT 1");
        const channelId = chanRes.rows[0].id;

        // We'll insert a temp customer
        const cust = await client.query("INSERT INTO customers (customer_name, channel_id) VALUES ('Temp Tester', $1) RETURNING id", [channelId]);

        const result = await calculateFreeItems(items, cust.rows[0].id, client);

        console.log('📊 Result:', result);

        // Assertions
        const freeC = result.find(r => r.product_id == idC);

        if (freeC && freeC.qty === 2) {
            console.log('✅ TEST PASSED: Basket Logic worked! Total 24 -> Got 2.');
        } else {
            console.log('❌ TEST FAILED: Unexpected results.');
            console.log('Expected: 2 C');
            console.log(`Got: ${freeC ? freeC.qty : 0} C`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.query('ROLLBACK'); // Always rollback to keep DB clean
        client.release();
        process.exit(0);
    }
}

testComboLogic();
