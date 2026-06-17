const { calculateFreeItems } = require('../utils/schemeEngine');
const { pool } = require('../config/db');

async function testPrioritySchemes() {
    const client = await pool.connect();
    try {
        console.log('🧪 Starting Priority Schemes Test...');
        await client.query('BEGIN');

        // 1. Fetch valid Vendor, Brand, Category
        const vRes = await client.query("SELECT id FROM vendors LIMIT 1");
        const bRes = await client.query("SELECT id FROM brands LIMIT 1");
        const cRes = await client.query("SELECT id FROM categories LIMIT 1");
        
        if (vRes.rows.length === 0 || bRes.rows.length === 0 || cRes.rows.length === 0) {
            throw new Error("Missing master data: vendors, brands, or categories");
        }

        const vid = vRes.rows[0].id;
        const bid = bRes.rows[0].id;
        const cid = cRes.rows[0].id;

        // 2. Setup Mock Product (MC-VITIES TASTIES CASHEW ALMOND RS.10)
        console.log('📦 Creating Mock Product...');
        const pRes = await client.query(`
            INSERT INTO products (product_name, product_code, vendor_id, brand_id, category_id, mrp, purchase_rate, dealer_rate) 
            VALUES ('Mc-Vities Tasties Cashew Almond', 'MV001', $1, $2, $3, 10.00, 8.00, 10.00) 
            RETURNING id
        `, [vid, bid, cid]);
        const pid = pRes.rows[0].id;

        // 3. Setup Schemes
        console.log('🎁 Creating Flat/Price Slab and Buy-Get-Free Schemes...');
        
        // Scheme 1: Flat scheme (Buy 72, special price Rs 7)
        const flatScheme = await client.query("INSERT INTO schemes (scheme_name, start_date, is_active) VALUES ('Flat 72 Scheme', CURRENT_DATE, true) RETURNING id");
        const flatSchemeId = flatScheme.rows[0].id;
        await client.query(`
            INSERT INTO scheme_rules (scheme_id, scheme_type, trigger_type, trigger_id, min_qty, special_price, channel_tier, reward_qty)
            VALUES ($1, 'PRICE_SLAB', 'Product', $2, 72, 7.00, 'Dealer', 0)
        `, [flatSchemeId, pid]);

        // Scheme 2: Buy-Get-Free (Buy 11 Get 1 Free)
        const bfgScheme = await client.query("INSERT INTO schemes (scheme_name, start_date, is_active) VALUES ('Buy 11 Get 1 Scheme', CURRENT_DATE, true) RETURNING id");
        const bfgSchemeId = bfgScheme.rows[0].id;
        await client.query(`
            INSERT INTO scheme_rules (scheme_id, scheme_type, trigger_type, trigger_id, min_qty, reward_qty, channel_tier, is_recursive)
            VALUES ($1, 'BUY_GET_FREE', 'Product', $2, 11, 1, 'Dealer', true)
        `, [bfgSchemeId, pid]);

        // 4. Test Scenario: Order 84 Pcs
        console.log('📝 Running check with ordered qty = 84...');
        const items = [
            { product_id: pid, qty: 84 }
        ];

        // Fetch Customer channel mapping for Dealer
        const chanRes = await client.query("SELECT id FROM channels WHERE channel_name = 'Dealer' LIMIT 1");
        const channelId = chanRes.rows[0].id;
        const custRes = await client.query("INSERT INTO customers (customer_name, channel_id) VALUES ('Priority Test Cust', $1) RETURNING id", [channelId]);
        const custId = custRes.rows[0].id;

        const result = await calculateFreeItems(items, custId, client);

        console.log('📊 Result from Engine:', JSON.stringify(result, null, 2));

        // Expected output:
        // - priceSlabs[pid].applied_qty should be exactly 72 (from Flat 72 Scheme).
        // - freeItems should contain exactly 1 free item (reward of Buy 11 Get 1 scheme on remaining 12).
        
        const slab = result.priceSlabs[pid];
        const freeItem = result.freeItems.find(f => f.product_id == pid);

        let pass = true;
        if (!slab || slab.applied_qty !== 72) {
            console.error(`❌ FAILED: Price slab applied_qty is ${slab ? slab.applied_qty : 'undefined'}, expected 72`);
            pass = false;
        } else {
            console.log(`✅ PASSED: Price slab applied to exactly ${slab.applied_qty} pcs`);
        }

        if (!freeItem || freeItem.qty !== 1) {
            console.error(`❌ FAILED: Free items qty is ${freeItem ? freeItem.qty : 'undefined'}, expected 1`);
            pass = false;
        } else {
            console.log(`✅ PASSED: Free items awarded = ${freeItem.qty} pcs`);
        }

        if (pass) {
            console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
        }

    } catch (e) {
        console.error('❌ Error during testing:', e);
    } finally {
        await client.query('ROLLBACK');
        client.release();
        pool.end();
        process.exit(0);
    }
}

testPrioritySchemes();
