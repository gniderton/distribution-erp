const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/stock/adjust/batches/:product_id
// @desc    Get Active Batches for a Product (for Dropdown)
router.get('/batches/:product_id', async (req, res) => {
    try {
        const { product_id } = req.params;
        const result = await pool.query(`
            SELECT id, batch_code, quantity_remaining, expiry_date 
            FROM inventory_batches 
            WHERE product_id = $1 AND quantity_remaining > 0 -- Only show available batches
            ORDER BY expiry_date ASC
        `, [product_id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Fetch Batches Error:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/stock/adjust
// @desc    Get Adjustment History
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT sa.*, p.product_name 
            FROM stock_adjustments sa
            JOIN products p ON sa.product_id = p.id
            ORDER BY sa.created_at DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('List Adjustments Error:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/stock/adjust
// @desc    Create Manual Stock Adjustment (Move/Write-off)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { items, notes } = req.body; // items: [{ product_id, qty, reason }]

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        await client.query('BEGIN');

        for (const item of items) {
            const { product_id, qty, reason } = item;
            const moveQty = Number(qty);

            if (moveQty <= 0) continue;

            // 1. BRANCH LOGIC: INCREASE (Found) vs DECREASE (Damage/Lost/Etc)
            // -------------------------------------------------------------
            if (reason === 'Found') {
                // HANDLE STOCK INCREASE
                // Create a new "FOUND" batch or add to a generic one.
                // We'll create a new batch for traceability.
                const batchCode = item.batch_code || `FOUND-${new Date().toISOString().split('T')[0]}`;

                await client.query(`
                    INSERT INTO inventory_batches 
                    (product_id, batch_code, quantity_initial, quantity_remaining, purchase_rate, is_active)
                    VALUES ($1, $2, $3, $3, 0, true) 
                `, [product_id, batchCode, moveQty]); // Rate 0 as it's found/bonus

            } else {
                // HANDLE STOCK DECREASE (Damage, Expiry, Lost)
                // -------------------------------
                let remainingToDeduct = moveQty;

                // Fetch FIFO Batches (Good Status only)
                const batches = await client.query(`
                    SELECT * 
                    FROM inventory_batches 
                    WHERE product_id = $1 AND quantity_remaining > 0 AND status = 'Good'
                    ORDER BY created_at ASC 
                    FOR UPDATE
                `, [product_id]);

                for (const batch of batches.rows) {
                    if (remainingToDeduct <= 0) break;

                    const available = Number(batch.quantity_remaining);
                    const deduct = Math.min(available, remainingToDeduct);

                    // 1. Reduce Source Batch
                    await client.query(`
                        UPDATE inventory_batches 
                        SET quantity_remaining = quantity_remaining - $1 
                        WHERE id = $2
                    `, [deduct, batch.id]);

                    // 2. CREATE NEW BATCH (With New Status) - The "Split"
                    // If reason is Lost, we might just deduct. But if Damage/Expiry, we keep it.
                    if (['Damage', 'Expiry'].includes(reason)) {
                        // Suffix for traceability: "GRN-101" -> "GRN-101-DMG"
                        const suffix = reason === 'Damage' ? '-DMG' : '-EXP';
                        // Avoid double suffix if moving already moved stock (unlikely here as we filter Good)
                        const newBatchCode = `${batch.batch_code}${suffix}`;

                        await client.query(`
                            INSERT INTO inventory_batches 
                            (product_id, batch_code, quantity_initial, quantity_remaining, purchase_rate, is_active, status, expiry_date, grn_id)
                            VALUES ($1, $2, $3, $3, $4, true, $5, $6, $7)
                        `, [
                            product_id, newBatchCode, deduct,
                            batch.purchase_rate, // Inherit Rate
                            reason, // Status = 'Damage' or 'Expiry'
                            batch.expiry_date, // Keep Expiry
                            batch.grn_id // Keep Origin Link
                        ]);
                    }

                    remainingToDeduct -= deduct;
                }
            }

            // 2. HANDLE DESTINATION (Legacy Support + Audit)
            // --------------------------------------------------
            if (['Damage', 'Expiry'].includes(reason)) {
                // We STILL update the summary bucket for now, just to keep the "Products Table" view consistent 
                // until we migrate the frontend to read non-good rows.
                await client.query(`
                    UPDATE products 
                    SET damaged_stock = COALESCE(damaged_stock, 0) + $1 
                    WHERE id = $2
                `, [moveQty, product_id]);
            }

            // 3. AUDIT LOG
            // ------------
            await client.query(`
                INSERT INTO stock_adjustments (product_id, qty, reason, notes)
                VALUES ($1, $2, $3, $4)
            `, [product_id, moveQty, reason, notes]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Stock Adjusted Successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Stock Adjustment Error:', err.message);
        res.status(500).json({ error: 'Server Error during Adjustment', details: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
