const { pool } = require('./config/db');

async function fixHangingTransit() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Find all negative batches
        const negRes = await client.query(`
            SELECT id, product_id, batch_code, quantity_remaining 
            FROM inventory_batches 
            WHERE quantity_remaining < 0
        `);

        for (const neg of negRes.rows) {
            let negQty = Math.abs(Number(neg.quantity_remaining));
            console.log(`Processing negative batch ${neg.id} for Product ${neg.product_id}, needs ${negQty} to knockoff.`);

            // Find available positive batches for this product
            const posRes = await client.query(`
                SELECT id, batch_code, quantity_remaining, expiry_date, mrp, purchase_rate, net_purchase_rate
                FROM inventory_batches 
                WHERE product_id = $1 AND quantity_remaining > 0
                ORDER BY created_at ASC
            `, [neg.product_id]);

            for (const pos of posRes.rows) {
                if (negQty <= 0) break;

                const posQty = Number(pos.quantity_remaining);
                const knockoff = Math.min(negQty, posQty);
                
                console.log(`  - Knocking off ${knockoff} using positive batch ${pos.id}`);

                // Update positive batch
                await client.query(`
                    UPDATE inventory_batches 
                    SET quantity_remaining = quantity_remaining - $1 
                    WHERE id = $2
                `, [knockoff, pos.id]);

                // Update negative batch (bring it towards 0) and sync metadata
                await client.query(`
                    UPDATE inventory_batches 
                    SET quantity_remaining = quantity_remaining + $1,
                        batch_code = $2,
                        expiry_date = $3,
                        mrp = $4,
                        purchase_rate = $5,
                        net_purchase_rate = $6
                    WHERE id = $7
                `, [knockoff, pos.batch_code, pos.expiry_date, pos.mrp, pos.purchase_rate, pos.net_purchase_rate, neg.id]);

                // Traceability
                await client.query(`
                    INSERT INTO stock_traceability (
                        batch_id, product_id, quantity_change, transaction_type, reference_type, notes
                    ) VALUES (
                        $1, $2, $3, 'TRANSIT-RECONCILIATION', 'System Reconciliation', 'Manual retro-fix for un-knocked transit batch'
                    )
                `, [neg.id, neg.product_id, knockoff]);

                negQty -= knockoff;
            }

            if (negQty > 0) {
                console.log(`  ! Could not fully knock off batch ${neg.id}. Still negative by ${negQty}.`);
            } else {
                console.log(`  * Successfully knocked off batch ${neg.id}.`);
            }
        }

        await client.query('COMMIT');
        console.log("All hanging transit batches have been successfully reconciled.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Reconciliation failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}
fixHangingTransit();
