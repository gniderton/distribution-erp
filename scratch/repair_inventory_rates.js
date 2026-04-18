const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function repairRates() {
    const client = await pool.connect();
    try {
        console.log("🔍 Scanning for batches with zero selling prices...");
        
        // 1. Find batches with zero rates
        const zeroBatches = await client.query(`
            SELECT ib.id, ib.product_id, ib.batch_code, p.product_name,
                   p.distributor_rate as master_dist,
                   p.wholesale_rate as master_whol,
                   p.dealer_rate as master_deal,
                   p.retail_rate as master_ret
            FROM inventory_batches ib
            JOIN products p ON ib.product_id = p.id
            WHERE ib.distributor_rate = 0 
               OR ib.wholesale_rate = 0 
               OR ib.dealer_rate = 0 
               OR ib.retail_rate = 0
        `);

        console.log(`Found ${zeroBatches.rows.length} batches to repair.`);

        if (zeroBatches.rows.length === 0) {
            console.log("✅ No batches found requiring repair.");
            return;
        }

        await client.query('BEGIN');

        for (const batch of zeroBatches.rows) {
            console.log(`Updating batch ${batch.id} (${batch.batch_code}) for product: ${batch.product_name}...`);
            await client.query(`
                UPDATE inventory_batches
                SET distributor_rate = $1,
                    wholesale_rate = $2,
                    dealer_rate = $3,
                    retail_rate = $4
                WHERE id = $5
            `, [
                batch.master_dist,
                batch.master_whol,
                batch.master_deal,
                batch.master_ret,
                batch.id
            ]);
        }

        console.log("🚀 Repairing net_purchase_rate where missing...");
        await client.query(`
            UPDATE inventory_batches ib
            SET net_purchase_rate = COALESCE(
                (SELECT (amount - tax_amount) / NULLIF(accepted_qty, 0) 
                 FROM purchase_invoice_lines 
                 WHERE id = ib.purchase_invoice_line_id),
                ib.purchase_rate
            )
            WHERE net_purchase_rate IS NULL OR net_purchase_rate = 0
        `);

        await client.query('COMMIT');
        console.log("✅ Data repair completed successfully!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Repair failed:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

repairRates();
