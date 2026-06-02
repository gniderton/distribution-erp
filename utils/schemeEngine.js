const { pool } = require('../config/db');

async function calculateFreeItems(items, customerId = null, client = null) {
    const db = client || pool;
    if (!items || items.length === 0) return { freeItems: [], priceSlabs: {} };

    const qtyMap = {}; // Tracks Remaining Qty for Single Logic
    items.forEach(i => {
        const pid = String(i.product_id);
        qtyMap[pid] = (qtyMap[pid] || 0) + Number(i.qty);
    });
    const productIds = Object.keys(qtyMap).map(Number);

    // ---------------------------------------------------------
    // STEP 0: FETCH TARGETING INFO
    // ---------------------------------------------------------
    // Fetch schemes that target this customer (or target NO specific customers)
    const targetedSchemeIdsRes = await db.query(`
        SELECT DISTINCT s.id
        FROM schemes s
        LEFT JOIN scheme_targeted_customers stc ON s.id = stc.scheme_id
        WHERE s.is_active = true
          AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
          AND s.start_date <= CURRENT_DATE
          AND (
            NOT EXISTS (SELECT 1 FROM scheme_targeted_customers WHERE scheme_id = s.id)
            OR stc.customer_id = $1
          )
    `, [customerId]);
    const validSchemeIds = targetedSchemeIdsRes.rows.map(r => r.id);

    if (validSchemeIds.length === 0) return { freeItems: [], priceSlabs: {} };

    // ---------------------------------------------------------
    // STEP 1: CONTEXT (Customer Tier & Product Meta)
    // ---------------------------------------------------------
    let defaultTier = 'Dealer';
    const brandOverrides = {};

    if (customerId) {
        const custRes = await db.query(`
            SELECT c.channel_name as default_price_tier 
            FROM customers cust
            LEFT JOIN channels c ON cust.channel_id = c.id
            WHERE cust.id = $1
        `, [customerId]);
        if (custRes.rows.length > 0) defaultTier = custRes.rows[0].default_price_tier || 'Dealer';

        const overRes = await db.query(`
            SELECT cbp.brand_id, c.channel_name as price_tier 
            FROM customer_brand_pricing cbp
            JOIN channels c ON cbp.channel_id = c.id
            WHERE cbp.customer_id = $1
        `, [customerId]);
        overRes.rows.forEach(r => brandOverrides[r.brand_id] = r.price_tier);
    }

    // Fetch Product Meta (Brand, Cat, CaseQty) for logic
    const metaRes = await db.query(`
        SELECT id, brand_id, category_id, case_quantity 
        FROM products WHERE id = ANY($1::int[])
    `, [productIds]);
    const productMeta = {};
    metaRes.rows.forEach(p => productMeta[p.id] = p);

    // ---------------------------------------------------------
    // STEP 2: FETCH RULES (Single & Combo)
    // ---------------------------------------------------------
    // A. Single Rules (BUY_GET_FREE, PRICE_SLAB, FLAT_MRP_DISCOUNT)
    const singleRulesRes = await db.query(`
        SELECT 
            sr.id as rule_id, sr.scheme_id, sr.scheme_type,
            sr.trigger_type, sr.trigger_id, sr.min_qty, sr.is_case_qty,
            sr.reward_product_id, sr.reward_qty, sr.special_price,
            sr.tier_level, sr.is_recursive, sr.channel_tier,
            s.scheme_name,
            (SELECT json_agg(product_id) FROM scheme_targeted_products WHERE scheme_rule_id = sr.id) as targeted_products
        FROM scheme_rules sr
        JOIN schemes s ON sr.scheme_id = s.id
        WHERE s.id = ANY($1::int[])
          AND sr.scheme_type IN ('BUY_GET_FREE', 'PRICE_SLAB', 'FLAT_MRP_DISCOUNT')
          AND (
            (sr.trigger_type = 'Product' AND sr.trigger_id = ANY($2::int[])) OR
            (sr.trigger_type = 'Brand') OR
            (sr.trigger_type = 'Category')
          )
    `, [validSchemeIds, productIds]);

    // B. Combo Rules
    const comboRulesRes = await db.query(`
        SELECT 
            s.id as scheme_id, s.scheme_name,
            sr.id as rule_id, sr.scheme_type,
            sr.reward_product_id, sr.reward_qty,
            sr.min_qty as basket_req,
            sr.is_recursive, sr.channel_tier,
            sr.tier_level,
            (SELECT json_agg(product_id) FROM scheme_combo_products WHERE scheme_rule_id = sr.id) as combo_products
        FROM schemes s
        JOIN scheme_rules sr ON s.id = sr.scheme_id 
        WHERE s.id = ANY($1::int[])
          AND sr.scheme_type = 'COMBO'
    `, [validSchemeIds]);

    // ---------------------------------------------------------
    // STEP 3: BUILD UNIFIED CANDIDATES LIST
    // ---------------------------------------------------------
    const candidates = [];

    // Process Single Rules
    for (const r of singleRulesRes.rows) {
        for (const pid of productIds) {
            const meta = productMeta[pid];
            if (!meta) continue;

            // Check if rule matches this product
            let matches = false;
            if (r.trigger_type === 'Product' && r.trigger_id == pid) {
                matches = true;
            } else if (r.trigger_type === 'Brand' && r.trigger_id == meta.brand_id) {
                if (!r.targeted_products || r.targeted_products.includes(pid)) {
                    matches = true;
                }
            } else if (r.trigger_type === 'Category' && r.trigger_id == meta.category_id) {
                matches = true;
            }

            if (!matches) continue;

            // Check tier constraints
            const effectiveTier = (brandOverrides[meta.brand_id] || defaultTier || '').trim().toLowerCase();
            const ruleTier = (r.channel_tier || '').trim().toLowerCase();
            if (ruleTier && ruleTier !== effectiveTier) continue;

            // Compute exact unit requirement
            const unitReq = r.is_case_qty ? (r.min_qty * (meta.case_quantity || 1)) : r.min_qty;

            candidates.push({
                type: 'SINGLE',
                rule_id: Number(r.rule_id),
                scheme_id: Number(r.scheme_id),
                scheme_name: r.scheme_name,
                scheme_type: r.scheme_type,
                pid,
                unitReq,
                special_price: r.special_price,
                is_recursive: r.is_recursive,
                reward_product_id: r.reward_product_id,
                reward_qty: r.reward_qty,
                tier_level: r.tier_level || 1
            });
        }
    }

    // Process Combo Rules
    for (const r of comboRulesRes.rows) {
        if (!r.combo_products || r.combo_products.length === 0) continue;

        // Check if at least one component is ordered
        const hasOrderedComponent = r.combo_products.some(pid => productIds.includes(Number(pid)));
        if (!hasOrderedComponent) continue;

        // Check tier constraints
        const firstPid = Number(r.combo_products[0]);
        const firstMeta = productMeta[firstPid];
        const effectiveTier = firstMeta ? ((brandOverrides[firstMeta.brand_id] || defaultTier || '').trim().toLowerCase()) : defaultTier.trim().toLowerCase();
        const ruleTier = (r.channel_tier || '').trim().toLowerCase();
        if (ruleTier && ruleTier !== effectiveTier) continue;

        candidates.push({
            type: 'COMBO',
            rule_id: Number(r.rule_id),
            scheme_id: Number(r.scheme_id),
            scheme_name: r.scheme_name,
            scheme_type: r.scheme_type,
            pids: r.combo_products.map(Number),
            unitReq: r.basket_req,
            is_recursive: r.is_recursive,
            reward_product_id: r.reward_product_id,
            reward_qty: r.reward_qty,
            tier_level: r.tier_level || 1
        });
    }

    // Sort by unitReq DESC (primary), tier_level DESC (secondary), rule_id ASC (tertiary)
    candidates.sort((a, b) => {
        if (b.unitReq !== a.unitReq) return b.unitReq - a.unitReq;
        if (b.tier_level !== a.tier_level) return b.tier_level - a.tier_level;
        return a.rule_id - b.rule_id;
    });

    // ---------------------------------------------------------
    // STEP 4: SEQUENTIALLY CONSUME QUANTITIES
    // ---------------------------------------------------------
    const remainingQty = { ...qtyMap };
    const freeItems = [];
    const priceSlabs = {}; // { [pid]: { special_price, discount_percentage, reason, applied_qty } }

    for (const cand of candidates) {
        if (cand.type === 'SINGLE') {
            const pid = cand.pid;
            const avail = remainingQty[pid] || 0;
            if (avail >= cand.unitReq) {
                const multiplier = cand.is_recursive ? Math.floor(avail / cand.unitReq) : 1;
                if (multiplier > 0) {
                    const consumedQty = multiplier * cand.unitReq;
                    remainingQty[pid] -= consumedQty;

                    if (cand.scheme_type === 'BUY_GET_FREE') {
                        const rewardQty = multiplier * cand.reward_qty;
                        freeItems.push({
                            product_id: cand.reward_product_id || pid,
                            qty: rewardQty,
                            reason: `${cand.scheme_name} [ID:${cand.scheme_id}] (Buy ${cand.unitReq} Get ${cand.reward_qty} x ${multiplier})`
                        });
                    } else if (cand.scheme_type === 'PRICE_SLAB' || cand.scheme_type === 'FLAT_MRP_DISCOUNT') {
                        if (!priceSlabs[pid]) {
                            priceSlabs[pid] = {
                                applied_qty: 0,
                                reason: `${cand.scheme_name} [ID:${cand.scheme_id}]`
                            };
                            if (cand.scheme_type === 'PRICE_SLAB') {
                                priceSlabs[pid].special_price = Number(cand.special_price);
                            } else {
                                priceSlabs[pid].discount_percentage = Number(cand.special_price);
                            }
                        }
                        priceSlabs[pid].applied_qty += consumedQty;
                    }
                }
            }
        } else if (cand.type === 'COMBO') {
            // Basket calculation across components
            let basketTotal = 0;
            for (const pid of cand.pids) {
                basketTotal += (remainingQty[pid] || 0);
            }

            if (basketTotal >= cand.unitReq) {
                const multiplier = cand.is_recursive ? Math.floor(basketTotal / cand.unitReq) : 1;
                if (multiplier > 0) {
                    let toDeduct = multiplier * cand.unitReq;
                    for (const pid of cand.pids) {
                        if (toDeduct <= 0) break;
                        const avail = remainingQty[pid] || 0;
                        const deduct = Math.min(avail, toDeduct);
                        remainingQty[pid] -= deduct;
                        toDeduct -= deduct;
                    }

                    const rewardQty = multiplier * cand.reward_qty;
                    freeItems.push({
                        product_id: cand.reward_product_id || cand.pids[0],
                        qty: rewardQty,
                        reason: `${cand.scheme_name} [ID:${cand.scheme_id}] (Basket Total ${basketTotal}, Req ${cand.unitReq} x ${multiplier})`
                    });
                }
            }
        }
    }

    // Merge duplicates in freeItems
    const mergedFree = [];
    freeItems.forEach(f => {
        const existing = mergedFree.find(m => m.product_id == f.product_id);
        if (existing) {
            existing.qty += f.qty;
            if (!existing.reason.includes(f.reason)) existing.reason += `, ${f.reason}`;
        } else {
            mergedFree.push(f);
        }
    });

    return {
        freeItems: mergedFree,
        priceSlabs
    };
}

module.exports = { calculateFreeItems };
