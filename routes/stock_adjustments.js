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
// @desc    Get Adjustment History with Filters
router.get('/', async (req, res) => {
    try {
        const { start_date, end_date, reason, search, limit = 100, page = 1 } = req.query;
        let query = `
            SELECT 
                sa.*, 
                p.product_name, p.product_code,
                b.brand_name,
                c.category_name
            FROM stock_adjustments sa
            JOIN products p ON sa.product_id = p.id
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (start_date) {
            params.push(start_date);
            query += ` AND sa.created_at >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            query += ` AND sa.created_at <= $${params.length}::timestamptz + interval '1 day'`;
        }
        if (reason) {
            params.push(reason);
            query += ` AND sa.reason = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (p.product_name ILIKE $${params.length} OR p.product_code ILIKE $${params.length} OR sa.notes ILIKE $${params.length})`;
        }

        // Count total for pagination
        const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) FROM');
        const totalResult = await pool.query(countQuery, params);
        
        // Sorting and Pagination
        query += ` ORDER BY sa.created_at DESC`;
        
        const limitVal = parseInt(limit);
        const offsetVal = (parseInt(page) - 1) * limitVal;
        
        params.push(limitVal, offsetVal);
        query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const result = await pool.query(query, params);
        
        res.json({
            data: result.rows,
            total: parseInt(totalResult.rows[0].count),
            page: parseInt(page),
            limit: limitVal
        });
    } catch (err) {
        console.error('List Adjustments Error:', err.message);
        res.status(500).json({ error: 'Server Error', details: err.message });
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

        // Accounting Accumulator
        let totalLossValue = 0;

        for (const item of items) {
            const { product_id, qty, reason } = item;
            const moveQty = Number(qty);

            if (moveQty <= 0) continue;

            // 1. BRANCH LOGIC: INCREASE (Found) vs DECREASE (Damage/Lost/Etc)
            // -------------------------------------------------------------
            if (reason === 'Found') {
                // ... (Existing Found Logic) ...
                const batchCode = item.batch_code || `FOUND-${new Date().toISOString().split('T')[0]}`;
                await client.query(`
                    INSERT INTO inventory_batches 
                    (product_id, batch_code, quantity_initial, quantity_remaining, purchase_rate, is_active)
                    VALUES ($1, $2, $3, $3, 0, true) 
                `, [product_id, batchCode, moveQty]);

            } else {
                // HANDLE STOCK DECREASE (Damage, Expiry, Lost)
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

                    // COST CALCULATION
                    const cost = Number(batch.purchase_rate) * deduct;

                    // 1. Reduce Source Batch
                    await client.query(`
                        UPDATE inventory_batches 
                        SET quantity_remaining = quantity_remaining - $1 
                        WHERE id = $2
                    `, [deduct, batch.id]);

                    // 2. CREATE NEW BATCH (With New Status) - The "Split"
                    if (['Damage', 'Expiry'].includes(reason)) {
                        // RECLASSIFICATION (Asset -> Asset). No Loss booked yet.
                        const suffix = reason === 'Damage' ? '-DMG' : '-EXP';
                        const newBatchCode = `${batch.batch_code}${suffix}`;

                        await client.query(`
                            INSERT INTO inventory_batches 
                            (product_id, batch_code, quantity_initial, quantity_remaining, purchase_rate, is_active, status, expiry_date, grn_id)
                            VALUES ($1, $2, $3, $3, $4, true, $5, $6, $7)
                        `, [
                            product_id, newBatchCode, deduct,
                            batch.purchase_rate,
                            reason,
                            batch.expiry_date,
                            batch.grn_id
                        ]);
                    } else if (reason === 'Lost') {
                        // LOSS BOOKING
                        // Item is gone. We track the value to book to Expense.
                        totalLossValue += cost;
                    }

                    remainingToDeduct -= deduct;
                }
            }

            // 2. HANDLE DESTINATION (Legacy Support)
            if (['Damage', 'Expiry'].includes(reason)) {
                await client.query(`
                    UPDATE products 
                    SET damaged_stock = COALESCE(damaged_stock, 0) + $1 
                    WHERE id = $2
                `, [moveQty, product_id]);
            }

            // 3. AUDIT LOG
            await client.query(`
                INSERT INTO stock_adjustments (product_id, qty, reason, notes)
                VALUES ($1, $2, $3, $4)
            `, [product_id, moveQty, reason, notes]);
        }

        // 4. ACCOUNTING INTEGRATION (For Losses)
        if (totalLossValue > 0) {
            const acc_inventory = 1001;
            const acc_loss = 5002; // Inventory Loss

            const roundedLoss = Number(totalLossValue.toFixed(2));
            const lossLines = [
                { code: acc_loss, debit: roundedLoss, credit: 0 },
                { code: acc_inventory, debit: 0, credit: roundedLoss }
            ];

            await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
                [new Date(), `Stock Adjustment Loss (${notes || 'Manual'})`, 'STOCK_ADJ', null, JSON.stringify(lossLines)]);
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
