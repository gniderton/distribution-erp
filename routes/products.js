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
// POST /api/products
router.post('/', async (req, res) => {
    let {
        vendor_id, product_name, brand_id, category_id,
        hsn_id, tax_id,
        mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate
    } = req.body;

    if (!vendor_id || !product_name || !brand_id || !category_id || !mrp || !purchase_rate) {
        return res.status(400).json({ error: 'Missing required fields (Vendor, Name, Brand, Category, MRP, Purchase Rate)' });
    }

    try {
        await pool.query('BEGIN');

        // 1. Fetch Brand Code and Category Code
        const metaRes = await pool.query(
            `SELECT 
                (SELECT brand_code FROM brands WHERE id = $1) as brand_code,
                (SELECT category_code FROM categories WHERE id = $2) as category_code
            `,
            [brand_id, category_id]
        );

        const { brand_code, category_code } = metaRes.rows[0];

        if (!brand_code || !category_code) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid Brand ID or Category ID' });
        }

        // 2. Generate Product Code: BRAND-CAT-001
        const prefix = `${brand_code}-${category_code}-`;

        // Find last code matching this prefix
        const lastCodeRes = await pool.query(
            `SELECT product_code FROM products 
             WHERE product_code LIKE $1 
             ORDER BY id DESC LIMIT 1`,
            [`${prefix}%`]
        );

        let nextNum = 1;
        if (lastCodeRes.rows.length > 0) {
            const lastCode = lastCodeRes.rows[0].product_code;
            // Extract the number part after the known prefix
            const suffix = lastCode.replace(prefix, '');
            const parsed = parseInt(suffix);
            if (!isNaN(parsed)) {
                nextNum = parsed + 1;
            }
        }

        const product_code = `${prefix}${String(nextNum).padStart(3, '0')}`;

        // 3. Insert Product
        const insertQuery = `
          INSERT INTO products (
            vendor_id, brand_id, category_id, product_code, product_name, 
            hsn_id, tax_id, 
            mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate, 
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
          RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            vendor_id, brand_id, category_id, product_code, product_name,
            hsn_id || null, tax_id || null,
            mrp, purchase_rate,
            distributor_rate || 0, wholesale_rate || 0, dealer_rate || 0, retail_rate || 0
        ]);

        await pool.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Product Code already exists (Concurrency issue, please try again)' });
        }
        res.status(500).json({ error: 'Database error creating product' });
    }
});

module.exports = router;
