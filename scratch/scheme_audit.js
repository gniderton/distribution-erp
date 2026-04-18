const { pool } = require('../config/db');

async function checkSchemesForPids() {
    try {
        const PIDS = [222, 224];
        
        console.log("--- 1. ACTIVE SCHEMES FOR 222/224 ---");
        const schemeRes = await pool.query(`
            SELECT s.id, s.scheme_name, sr.scheme_type, sr.trigger_type, sr.trigger_id, sr.min_qty, sr.reward_qty, sr.special_price, sr.channel_tier
            FROM schemes s
            JOIN scheme_rules sr ON s.id = sr.scheme_id
            WHERE s.is_active = true 
              AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
              AND (
                (sr.trigger_type = 'Product' AND sr.trigger_id = ANY($1)) OR
                (sr.trigger_type = 'Brand') OR
                (sr.trigger_type = 'Category')
              )
        `, [PIDS]);
        console.table(schemeRes.rows);

        console.log("\n--- 2. CUSTOMER METADATA (SUCCESS VS FAILURE) ---");
        const custRes = await pool.query(`
            SELECT id, customer_name, channel_id, category_id, route_id
            FROM customers 
            WHERE customer_name IN (
                'Fresca Bake and Cool', 
                'Zenith Agencies', 
                'SAFA HYPER PAALAKOTTUVAYAL'
            )
        `);
        console.table(custRes.rows);

    } catch (err) {
        console.error("Scheme Check Error:", err);
    } finally {
        await pool.end();
    }
}

checkSchemesForPids();
