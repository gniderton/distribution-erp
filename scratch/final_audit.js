const { pool } = require('../config/db');

async function finalAudit() {
    try {
        const orderId = 352;
        console.log(`--- FINAL AUDIT FOR ORDER ${orderId} ---`);
        
        // 1. Check for duplicate lines
        const dupRes = await pool.query(`
            SELECT product_id, COUNT(*) 
            FROM sales_order_lines 
            WHERE sales_order_id = $1 
            GROUP BY product_id HAVING COUNT(*) > 1
        `, [orderId]);
        console.log("Duplicate Lines Found:", dupRes.rows);

        // 2. Check Batch Rates (Presence of NULLs)
        console.log("\n--- BATCH RATE INTEGRITY (NULL CHECK) ---");
        const rateRes = await pool.query(`
            SELECT id, product_id, distributor_rate, wholesale_rate, dealer_rate, retail_rate, purchase_rate
            FROM inventory_batches 
            WHERE product_id IN (222, 224) AND quantity_remaining > 0
        `);
        console.table(rateRes.rows);
        
        // Check for ANY null values in those rate columns
        const hasNulls = rateRes.rows.some(r => 
            r.distributor_rate === null || 
            r.wholesale_rate === null || 
            r.dealer_rate === null || 
            r.retail_rate === null
        );
        console.log("Batches contain NULL rates:", hasNulls);

        // 3. Check for "Price Slab" schemes that might be zeroing out
        console.log("\n--- SEARCHING FOR POTENTIALLY ZEROING SCHEMES ---");
        const zeroSchemeRes = await pool.query(`
            SELECT sr.*, s.scheme_name 
            FROM scheme_rules sr
            JOIN schemes s ON sr.scheme_id = s.id
            WHERE s.is_active = true 
              AND sr.scheme_type = 'PRICE_SLAB'
              AND (sr.special_price = 0 OR sr.special_price IS NULL)
        `);
        console.log("Zeroing Schemes Found:", zeroSchemeRes.rows.length);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

finalAudit();
