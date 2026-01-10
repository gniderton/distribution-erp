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
            hsn_id, tax_id, ean_code,
            mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate, 
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
          RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            vendor_id, brand_id, category_id, product_code, product_name,
            hsn_id || null, tax_id || null, req.body.ean_code || null,
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

// GET /api/products/template-data - Download Reference Data for CSV
router.get('/template-data', async (req, res) => {
    try {
        const [brands, categories, taxes, hsn] = await Promise.all([
            pool.query('SELECT id, brand_name, brand_code FROM brands WHERE is_active = true'),
            pool.query('SELECT id, category_name, category_code FROM categories WHERE is_active = true'),
            pool.query('SELECT id, tax_name, tax_percentage FROM taxes WHERE is_active = true'),
            pool.query('SELECT id, hsn_code, hsn_description FROM hsn_codes WHERE is_active = true')
        ]);

        res.json({
            brands: brands.rows,
            categories: categories.rows,
            taxes: taxes.rows,
            hsn: hsn.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});

// POST /api/products/import - Bulk Import
router.post('/import', async (req, res) => {
    const { items } = req.body; // Array of objects matching single create inputs
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No items provided' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Validation & Preparation
        // We need Brand Codes and Category Codes. Fetch ALL mappings first.
        const brandsRes = await client.query('SELECT id, brand_code FROM brands');
        const catsRes = await client.query('SELECT id, category_code FROM categories');

        const brandMap = {}; // id -> code
        brandsRes.rows.forEach(r => brandMap[r.id] = r.brand_code);

        const catMap = {}; // id -> code
        catsRes.rows.forEach(r => catMap[r.id] = r.category_code);

        // 2. Group items by Prefix to manage sequences locally
        // Key: "BRAND-CAT-", Value: [Item1, Item2...]
        const groups = {};

        for (const item of items) {
            const brandCode = brandMap[item.brand_id];
            const catCode = catMap[item.category_id];

            if (!brandCode || !catCode) {
                throw new Error(`Invalid Brand (${item.brand_id}) or Category (${item.category_id}) for product: ${item.product_name}`);
            }

            const prefix = `${brandCode}-${catCode}-`;
            if (!groups[prefix]) groups[prefix] = [];
            groups[prefix].push(item);
        }

        const stats = { inserted: 0 };

        // 3. Process each group
        for (const prefix of Object.keys(groups)) {
            const groupItems = groups[prefix];

            // Find current max sequence for this prefix
            const lastCodeRes = await client.query(
                `SELECT product_code FROM products 
                 WHERE product_code LIKE $1 
                 ORDER BY id DESC LIMIT 1`,
                [`${prefix}%`]
            );

            let nextNum = 1;
            if (lastCodeRes.rows.length > 0) {
                const suffix = lastCodeRes.rows[0].product_code.replace(prefix, '');
                const parsed = parseInt(suffix);
                if (!isNaN(parsed)) nextNum = parsed + 1;
            }

            // Assign codes and Insert
            for (const item of groupItems) {
                const product_code = `${prefix}${String(nextNum).padStart(3, '0')}`;

                const query = `
                  INSERT INTO products (
                    vendor_id, brand_id, category_id, product_code, product_name,
                    ean_code,
                    hsn_id, tax_id, 
                    mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate, 
                    is_active
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
                `;

                await client.query(query, [
                    item.vendor_id, item.brand_id, item.category_id, product_code, item.product_name,
                    item.ean_code || null,
                    item.hsn_id || null, item.tax_id || null,
                    item.mrp || 0, item.purchase_rate || 0,
                    item.distributor_rate || 0, item.wholesale_rate || 0, item.dealer_rate || 0, item.retail_rate || 0
                ]);

                nextNum++;
                stats.inserted++;
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, count: stats.inserted });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
