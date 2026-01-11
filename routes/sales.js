const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// POST /api/sales/allocate
// Input: { items: [{ product_id, qty }] }
// Output: [{ product_id, allocations: [{ batch_id, batch_number, qty, mrp, rate }] }]
router.post('/allocate', async (req, res) => {
    const client = await pool.connect();
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid items array' });
        }

        const results = [];

        for (const item of items) {
            const requestedQty = Number(item.qty);
            const productId = item.product_id;

            // 1. Fetch Batches (FIFO: Oldest First)
            const batchesRes = await client.query(`
                SELECT id, batch_number, qty_good, mrp, sale_rate 
                FROM product_batches 
                WHERE product_id = $1 AND qty_good > 0 AND is_active = true
                ORDER BY received_date ASC, created_at ASC
            `, [productId]);

            let remaining = requestedQty;
            const allocations = [];

            for (const batch of batchesRes.rows) {
                if (remaining <= 0) break;

                const available = Number(batch.qty_good);
                const take = Math.min(remaining, available);

                allocations.push({
                    batch_id: batch.id,
                    batch_number: batch.batch_number,
                    qty: take,
                    mrp: Number(batch.mrp),
                    sale_rate: Number(batch.sale_rate) || Number(batch.mrp) // Fallback to MRP if sale_rate null
                });

                remaining -= take;
            }

            // Merging Logic (Group by MRP)
            const mergedMap = {};
            for (const alloc of allocations) {
                const key = alloc.mrp; // Grouping by MRP only as requested
                if (!mergedMap[key]) {
                    mergedMap[key] = {
                        mrp: alloc.mrp,
                        sale_rate: alloc.sale_rate,
                        qty: 0,
                        batches: [] // Track which batches contributed
                    };
                }
                mergedMap[key].qty += Number(alloc.qty);
                mergedMap[key].batches.push({ id: alloc.batch_id, qty: alloc.qty });
            }
            const merged_allocations = Object.values(mergedMap);

            results.push({
                product_id: productId,
                requested_qty: requestedQty,
                allocations, // Detailed Split (for DB Save)
                merged_allocations // UI Display (for Invoice Rows)
            });
        }

        res.json(results);
    } catch (err) {
        console.error("Allocation Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
