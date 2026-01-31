const { pool } = require('../config/db');

async function calculateFreeItems(items, client = null) {
    const db = client || pool;
    // Input: [{ product_id, qty }]
    if (!items || items.length === 0) return [];

    // 1. Fetch Rules
    const rulesRes = await db.query(`
        SELECT sr.*, s.scheme_name
        FROM scheme_rules sr
        JOIN schemes s ON sr.scheme_id = s.id
        WHERE s.is_active = true 
          AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
          AND s.start_date <= CURRENT_DATE
        ORDER BY sr.tier_level DESC, sr.min_qty DESC
    `);
    const rules = rulesRes.rows;

    if (rules.length === 0) return [];

    // 2. Fetch Product Meta (Brand, Cat, CaseQty)
    const productIds = items.map(i => i.product_id);
    const metaRes = await db.query(`
        SELECT id, brand_id, category_id, case_quantity 
        FROM products WHERE id = ANY($1::int[])
    `, [productIds]);

    const productMeta = {};
    metaRes.rows.forEach(p => productMeta[p.id] = p);

    const freeItems = [];

    // 3. Process
    for (const item of items) {
        const meta = productMeta[item.product_id];
        if (!meta) continue;

        const qty = Number(item.qty);

        // Filter applicable rules
        const applicableRules = rules.filter(r => {
            if (r.trigger_type === 'Product') return r.trigger_id == item.product_id;
            if (r.trigger_type === 'Brand') return r.trigger_id == meta.brand_id;
            if (r.trigger_type === 'Category') return r.trigger_id == meta.category_id;
            return false;
        });

        let remainingQty = qty;

        for (const rule of applicableRules) {
            let triggerPool = 0;
            if (rule.is_case_qty) {
                const caseSize = meta.case_quantity || 1;
                triggerPool = Math.floor(remainingQty / caseSize);
            } else {
                triggerPool = remainingQty;
            }

            if (triggerPool >= rule.min_qty) {
                let multiplier = rule.is_recursive ? Math.floor(triggerPool / rule.min_qty) : 1;

                if (multiplier > 0) {
                    const freeQty = multiplier * rule.reward_qty;
                    freeItems.push({
                        product_id: rule.reward_product_id || item.product_id,
                        qty: freeQty,
                        reason: `${rule.scheme_name} (Buy ${rule.min_qty} Get ${rule.reward_qty})`
                    });

                    const consumed = rule.is_case_qty
                        ? (multiplier * rule.min_qty * (meta.case_quantity || 1))
                        : (multiplier * rule.min_qty);
                    remainingQty -= consumed;
                }
            }
        }
    }

    // Merge duplicates
    const merged = [];
    freeItems.forEach(f => {
        const existing = merged.find(m => m.product_id == f.product_id);
        if (existing) {
            existing.qty += f.qty;
            if (!existing.reason.includes(f.reason)) existing.reason += `, ${f.reason}`;
        } else {
            merged.push(f);
        }
    });

    return merged;
}

module.exports = { calculateFreeItems };
