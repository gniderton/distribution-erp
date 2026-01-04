const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/products - List products with joins for friendly names
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit, search = '', vendor_id } = req.query; // limit defaults to undefined if not passed

        const whereConditions = [];
        const params = [];
        let paramIdx = 1;

        if (search) {
            whereConditions.push(`(p.product_name ILIKE $${paramIdx} OR p.product_code ILIKE $${paramIdx} OR b.brand_name ILIKE $${paramIdx})`);
            params.push(`%${search}%`);
            paramIdx++;
        }

        if (vendor_id) {
            whereConditions.push(`p.vendor_id = $${paramIdx}`);
            params.push(vendor_id);
            paramIdx++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Base Query
        let query = `
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
      ${whereClause}
      ORDER BY p.id ASC
    `;

        // Append Pagination if limit is provided and valid (not '0')
        // Note: limit coming from query is string.
        if (limit && limit !== '0') {
            const limitVal = parseInt(limit);
            const pageVal = parseInt(page);
            const offset = (pageVal - 1) * limitVal;

            query += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
            params.push(limitVal, offset);
        }

        const countQuery = `
      SELECT COUNT(*) FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
    `;

        // Count params are whatever search/vendor params existed before limit was added
        // If we added limit (2 params) to the end, slice them off.
        // If we didn't add limit, params is just search/vendor params.
        const countParams = (limit && limit !== '0') ? params.slice(0, params.length - 2) : params;

        const [rows, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);

        res.json({
            data: rows.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                limit: limit ? parseInt(limit) : parseInt(countResult.rows[0].count) // if unlimited, limit = total
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
