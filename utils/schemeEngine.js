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
    // STEP 1: SMART LOOKUP (Filter Inputs)
    // ---------------------------------------------------------
    // Identify which products are involved in Single or Combo schemes
    const statusRes = await db.query(`
        -- Check Single Rules
        SELECT sr.trigger_id as product_id, 'SINGLE' as type
        FROM scheme_rules sr
        WHERE sr.scheme_id = ANY($1::int[])
          AND sr.trigger_type = 'Product'
          AND sr.trigger_id = ANY($2::int[])

        UNION

        -- Check Combo Components
        SELECT scp.product_id, 'COMBO' as type
        FROM scheme_combo_products scp
        JOIN scheme_rules sr ON scp.scheme_rule_id = sr.id
        WHERE sr.scheme_id = ANY($1::int[])
          AND scp.product_id = ANY($2::int[])
    `, [validSchemeIds, productIds]);

    const activeTypes = {}; // { 101: ['SINGLE', 'COMBO'] }
    statusRes.rows.forEach(r => {
        if (!activeTypes[r.product_id]) activeTypes[r.product_id] = new Set();
        activeTypes[r.product_id].add(r.type);
    });

    const freeItems = [];

    // ---------------------------------------------------------
    // STEP 1.5: CONTEXT (Customer Tier)
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
    // STEP 2: SINGLE LOGIC (Remaining Stock) - PRIORITY 1
    // ---------------------------------------------------------
    // Only fetch rules for items that still have quantity AND are flagged as SINGLE
    const singleCandidates = Object.keys(qtyMap).filter(pid =>
        qtyMap[pid] > 0 && activeTypes[pid] && activeTypes[pid].has('SINGLE')
    );

    if (singleCandidates.length > 0) {
        const rulesRes = await db.query(`
            SELECT sr.*, s.scheme_name, s.id as scheme_id
            FROM scheme_rules sr
            JOIN schemes s ON sr.scheme_id = s.id
            WHERE s.id = ANY($1::int[])
              AND sr.scheme_type = 'BUY_GET_FREE' 
              AND (
                (sr.trigger_type = 'Product' AND sr.trigger_id = ANY($2::int[])) OR
                (sr.trigger_type = 'Brand') OR
                (sr.trigger_type = 'Category')
              )
            ORDER BY sr.tier_level DESC, sr.min_qty DESC
        `, [validSchemeIds, singleCandidates]);

        const rules = rulesRes.rows;

        for (const pid of singleCandidates) {
            const pidStr = String(pid);
            const meta = productMeta[pidStr];
            if (!meta) continue;

            let remainingQty = qtyMap[pidStr];
            const effectiveTier = (brandOverrides[meta.brand_id] || defaultTier || '').trim().toLowerCase();

            // Filter rules that match this product (Direct, Brand, or Category)
            const applicableRules = rules.filter(r => {
                const ruleTier = (r.channel_tier || '').trim().toLowerCase();
                if (ruleTier && ruleTier !== effectiveTier) return false;

                if (r.trigger_type === 'Product' && r.trigger_id != pid) return false;
                if (r.trigger_type === 'Brand' && r.trigger_id != meta.brand_id) return false;
                if (r.trigger_type === 'Category' && r.trigger_id != meta.category_id) return false;

                return true;
            });

            // Tracking applied schemes for this product to ensure tier exclusivity if desired
            // (Standard: apply only the best rule PER SCHEME)
            const schemesApplied = new Set();

            for (const rule of applicableRules) {
                if (remainingQty <= 0) break;

                // [POLICY] If we already applied a rule from this scheme for this product, skip lower tiers
                if (schemesApplied.has(rule.scheme_id)) continue;

                let triggerPool = rule.is_case_qty ? Math.floor(remainingQty / (meta.case_quantity || 1)) : remainingQty;

                if (triggerPool >= rule.min_qty) {
                    let multiplier = rule.is_recursive ? Math.floor(triggerPool / rule.min_qty) : 1;
                    if (multiplier > 0) {
                        const rewardQty = multiplier * rule.reward_qty;
                        console.log(`[SCHEME] Applied ${rule.scheme_name} to PID ${pid}: Buy ${rule.min_qty} Get ${rule.reward_qty} x ${multiplier} = ${rewardQty}`);

                        freeItems.push({
                            product_id: rule.reward_product_id || pid,
                            qty: rewardQty,
                            reason: `${rule.scheme_name} [ID:${rule.scheme_id}] (Buy ${rule.min_qty} Get ${rule.reward_qty})`
                        });

                        const consumed = rule.is_case_qty ? (multiplier * rule.min_qty * (meta.case_quantity || 1)) : (multiplier * rule.min_qty);
                        remainingQty -= consumed;
                        qtyMap[pidStr] -= consumed;
                        schemesApplied.add(rule.scheme_id);
                    }
                }
            }
        }
    }

    // ---------------------------------------------------------
    // STEP 3: COMBO LOGIC (Basket/Bucket Sum) - PRIORITY 2
    // ---------------------------------------------------------
    // A. Fetch All Active Combo Definitions involving these products
    const comboDefRes = await db.query(`
        SELECT 
            s.id as scheme_id, s.scheme_name,
            sr.id as rule_id,
            scp.product_id as component_pid, 
            sr.reward_product_id, sr.reward_qty,
            sr.min_qty as limit_qty -- The Basket Size Requirement (e.g. 24)
        FROM schemes s
        JOIN scheme_rules sr ON s.id = sr.scheme_id 
        JOIN scheme_combo_products scp ON sr.id = scp.scheme_rule_id
        WHERE s.id = ANY($1::int[])
          AND sr.scheme_type = 'COMBO'
    `, [validSchemeIds]);

    // Group by Scheme Rule ID (Combos are per-rule)
    const combos = {};
    comboDefRes.rows.forEach(r => {
        if (!combos[r.rule_id]) {
            combos[r.rule_id] = {
                name: r.scheme_name,
                scheme_id: r.scheme_id,
                reward_pid: r.reward_product_id,
                reward_qty: r.reward_qty,
                basket_req: r.limit_qty,
                components: new Set()
            };
        }
        combos[r.rule_id].components.add(r.component_pid);
    });

    // Process Combos (Basket Logic)
    for (const [ruleId, combo] of Object.entries(combos)) {
        // 1. Calculate Total Basket Qty
        let basketTotal = 0;
        const involvedPids = [];

        for (const pid of combo.components) {
            if (qtyMap[pid]) {
                basketTotal += qtyMap[pid];
                involvedPids.push(pid);
            }
        }

        // 2. Determine Multiplier
        const multiplier = Math.floor(basketTotal / combo.basket_req);

        // 3. Award & Consume
        if (multiplier > 0) {
            freeItems.push({
                product_id: combo.reward_pid || Array.from(combo.components)[0],
                qty: multiplier * combo.reward_qty,
                reason: `${combo.name} [ID:${combo.scheme_id}] (Basket Total ${basketTotal}, Req ${combo.basket_req})`
            });

            let toDeduct = multiplier * combo.basket_req;
            for (const pid of involvedPids) {
                if (toDeduct <= 0) break;
                const available = qtyMap[pid];
                const deduct = Math.min(available, toDeduct);
                qtyMap[pid] -= deduct;
                toDeduct -= deduct;
            }
        }
    }

    // ---------------------------------------------------------
    // STEP 4: PRICE SLABS (Rate Overrides) & FLAT MRP DISCOUNT
    // ---------------------------------------------------------
    const priceSlabs = {}; // { [pid]: { special_price, discount_percentage, reason } }

    const slabRes = await db.query(`
        SELECT 
            sr.id as rule_id, sr.trigger_id as product_id, sr.trigger_type,
            sr.min_qty, sr.special_price, sr.scheme_type,
            s.scheme_name, sr.channel_tier, s.id as scheme_id,
            (SELECT json_agg(product_id) FROM scheme_targeted_products WHERE scheme_rule_id = sr.id) as targeted_products
        FROM scheme_rules sr
        JOIN schemes s ON sr.scheme_id = s.id
        WHERE s.id = ANY($1::int[])
          AND sr.scheme_type IN ('PRICE_SLAB', 'FLAT_MRP_DISCOUNT')
          AND sr.special_price IS NOT NULL
        ORDER BY sr.min_qty DESC
    `, [validSchemeIds]);

    slabRes.rows.forEach(r => {
        const pidsToEvaluate = [];
        if (r.trigger_type === 'Product') {
            pidsToEvaluate.push(r.product_id);
        } else if (r.trigger_type === 'Brand') {
            // All products of this brand (from inputs)
            productIds.forEach(pid => {
                if (productMeta[pid]?.brand_id == r.product_id) {
                    // Check if rule has specific targeted products
                    if (!r.targeted_products || r.targeted_products.includes(pid)) {
                        pidsToEvaluate.push(pid);
                    }
                }
            });
        }

        pidsToEvaluate.forEach(pid => {
            if (priceSlabs[pid]) return; // Best slab already applied

            const meta = productMeta[pid];
            const effectiveTier = (brandOverrides[meta?.brand_id] || defaultTier || '').trim().toLowerCase();
            const ruleTier = (r.channel_tier || '').trim().toLowerCase();
            if (ruleTier && ruleTier !== effectiveTier) return;

            const originalQty = items.find(i => i.product_id == pid)?.qty || 0;
            if (originalQty >= r.min_qty) {
                if (r.scheme_type === 'PRICE_SLAB') {
                    priceSlabs[pid] = {
                        special_price: Number(r.special_price),
                        reason: `${r.scheme_name} [ID:${r.scheme_id}] (Slab >= ${r.min_qty})`
                    };
                } else if (r.scheme_type === 'FLAT_MRP_DISCOUNT') {
                    priceSlabs[pid] = {
                        discount_percentage: Number(r.special_price),
                        reason: `${r.scheme_name} [ID:${r.scheme_id}] (${r.special_price}% MRP Discount)`
                    };
                }
            }
        });
    });


    // Merge duplicates
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
