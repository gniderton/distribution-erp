const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/products - List products with joins for friendly names
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const searchClause = search
            ? `WHERE p.product_name ILIKE $1 OR p.product_code ILIKE $1 OR b.brand_name ILIKE $1`
            : '';
        const params = search ? [`%${search}%`, limit, offset] : [limit, offset];
        const limitIdx = search ? 2 : 1;
        const offsetIdx = search ? 3 : 2;

        // Logic: Join with Brands and Categories to return useful names, not just IDs
        const query = `
      SELECT 
        p.*,
        b.brand_name,
        c.category_name,
        t.tax_name,
        h.hsn_code
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN taxes t ON p.tax_id = t.id
      LEFT JOIN hsn_codes h ON p.hsn_id = h.id
      ${searchClause}
      ORDER BY p.id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

        const countQuery = `
      SELECT COUNT(*) FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      ${searchClause}
    `;
        const countParams = search ? [`%${search}%`] : [];

        const [rows, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);

        res.json({
            data: rows.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching products' });
    }
});

// POST /api/products
router.post('/', async (req, res) => {
    const { vendor_id, product_code, product_name, mrp, purchase_rate, is_active } = req.body;
    // TODO: Add full field list

    if (!product_code || !product_name || !vendor_id || !mrp || !purchase_rate) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const query = `
      INSERT INTO products (vendor_id, product_code, product_name, mrp, purchase_rate, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
        const result = await pool.query(query, [vendor_id, product_code, product_name, mrp, purchase_rate, is_active || true]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error creating product' });
    }
});

module.exports = router;
