const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// POST /api/purchase-orders - Create a new PO
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            vendor_id,
            po_date,
            total_net,
            total_taxable,
            gst,
            grand_total,
            remarks,
            items // Array of lines
        } = req.body;

        // 1. Start Transaction
        await client.query('BEGIN');

        // 2. Get Next PO Number (Locking the row)
        const seqRes = await client.query(
            `SELECT id, prefix, current_number FROM document_sequences 
       WHERE document_type = 'PO' AND is_active = true 
       FOR UPDATE`
        );

        if (seqRes.rows.length === 0) {
            throw new Error('PO Sequence not configured');
        }

        const { id: seqId, prefix, current_number } = seqRes.rows[0];
        const nextNum = parseInt(current_number) + 1;
        const poNumber = `${prefix}${nextNum}`;

        // 3. Update Sequence
        await client.query(
            'UPDATE document_sequences SET current_number = $1 WHERE id = $2',
            [nextNum, seqId]
        );

        // 4. Insert Header
        const headerRes = await client.query(
            `INSERT INTO purchase_order_headers 
       (po_number, po_date, vendor_id, total_net, total_taxable, gst, grand_total, remarks, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Draft')
       RETURNING id`,
            [poNumber, po_date || new Date(), vendor_id, total_net, total_taxable, gst, grand_total, remarks]
        );
        const headerId = headerRes.rows[0].id;

        // 5. Insert Lines
        if (items && items.length > 0) {
            for (const item of items) {
                if (item.qty > 0) { // Double check qty > 0
                    await client.query(
                        `INSERT INTO purchase_order_lines 
             (purchase_order_header_id, product_id, product_name, ordered_qty, mrp, rate, discount_percent, amount)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            headerId,
                            item.product_id,
                            item.product_name,
                            item.qty,
                            item.mrp || 0,
                            item.rate || 0,
                            item.discount_percent || 0,
                            item.amount || 0
                        ]
                    );
                }
            }
        }

        // 6. Commit
        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Purchase Order Created',
            po_number: poNumber,
            po_id: headerId
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('PO Creation Error:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

// GET /api/purchase-orders - List POs
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const result = await pool.query(`
            SELECT h.*, v.vendor_name 
            FROM purchase_order_headers h
            LEFT JOIN vendors v ON h.vendor_id = v.id
            ORDER BY h.id DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const countRes = await pool.query('SELECT COUNT(*) FROM purchase_order_headers');

        res.json({
            data: result.rows,
            pagination: {
                total: parseInt(countRes.rows[0].count),
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
