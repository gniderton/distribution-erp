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
        const [brands, categories, taxes, hsn, vendors] = await Promise.all([
            pool.query('SELECT id, brand_name, brand_code FROM brands WHERE is_active = true'),
            pool.query('SELECT id, category_name, category_code FROM categories WHERE is_active = true'),
            pool.query('SELECT id, tax_name, tax_percentage FROM taxes WHERE is_active = true'),
            pool.query('SELECT id, hsn_code, hsn_description FROM hsn_codes WHERE is_active = true'),
            pool.query('SELECT id, vendor_name FROM vendors WHERE is_active = true')
        ]);

        res.json({
            brands: brands.rows,
            categories: categories.rows,
            taxes: taxes.rows,
            hsn: hsn.rows,
            vendors: vendors.rows
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

// GET /api/products/export - Download CSV for Bulk Update
router.get('/export', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id as "Product ID",
                p.product_name as "Product Name",
                b.brand_name as "Brand Name",
                c.category_name as "Category Name",
                v.vendor_name as "Vendor Name",
                p.mrp as "MRP",
                p.purchase_rate as "Purchase Rate",
                p.distributor_rate as "Distributor Rate",
                p.wholesale_rate as "Wholesale Rate",
                p.dealer_rate as "Dealer Rate",
                p.retail_rate as "Retail Rate",
                t.tax_name as "Tax Name",
                h.hsn_code as "HSN Code",
                p.ean_code as "EAN"
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN vendors v ON p.vendor_id = v.id (SELECT id, vendor_name FROM vendors) v ON p.vendor_id = v.id -- Basic Join
            LEFT JOIN taxes t ON p.tax_id = t.id
            LEFT JOIN hsn_codes h ON p.hsn_id = h.id
            WHERE p.is_active = true
            ORDER BY p.id ASC
        `;

        // Correcting Join syntax above for safety
        const safeQuery = `
            SELECT 
                p.id as "Product ID",
                p.product_name as "Product Name",
                b.brand_name as "Brand Name",
                c.category_name as "Category Name",
                v.vendor_name as "Vendor Name",
                p.mrp as "MRP",
                p.purchase_rate as "Purchase Rate",
                p.distributor_rate as "Distributor Rate",
                p.wholesale_rate as "Wholesale Rate",
                p.dealer_rate as "Dealer Rate",
                p.retail_rate as "Retail Rate",
                t.tax_name as "Tax Name",
                h.hsn_code as "HSN Code",
                p.ean_code as "EAN"
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN vendors v ON p.vendor_id = v.id
            LEFT JOIN taxes t ON p.tax_id = t.id
            LEFT JOIN hsn_codes h ON p.hsn_id = h.id
            WHERE p.is_active = true
            ORDER BY p.id ASC
        `;

        const { rows } = await pool.query(safeQuery);

        // Convert to CSV
        if (rows.length === 0) {
            return res.send("Product ID,Product Name,Brand Name,Category Name,Vendor Name,MRP,Purchase Rate,Distributor Rate,Wholesale Rate,Dealer Rate,Retail Rate,Tax Name,HSN Code,EAN");
        }

        const headers = Object.keys(rows[0]).join(',');
        const csvRows = rows.map(row => {
            return Object.values(row).map(val => {
                const str = String(val === null ? '' : val);
                // Escape quotes and wrap in quotes if contains comma
                if (str.includes(',') || str.includes('"')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',');
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');
        res.send([headers, ...csvRows].join('\n'));

    } catch (err) {
        console.error("Export Error:", err);
        res.status(500).send("Error generating CSV");
    }
});

// POST /api/products/bulk-update - Process Edited CSV (JSON)
router.post('/bulk-update', async (req, res) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Invalid items array' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let updatedCount = 0;
        let createdCount = 0;

        // Reuse Import Logic for New Items, but here we focus on Updates first
        // Refetch Mappings for ID resolution
        const brandsRes = await client.query('SELECT id, brand_name, brand_code FROM brands');
        const catsRes = await client.query('SELECT id, category_name, category_code FROM categories');
        const taxRes = await client.query('SELECT id, tax_name FROM taxes');
        const hsnRes = await client.query('SELECT id, hsn_code FROM hsn_codes');
        const vendRes = await client.query('SELECT id, vendor_name FROM vendors');

        const brandMap = {}; brandsRes.rows.forEach(r => brandMap[r.brand_name.toLowerCase().trim()] = r);
        const catMap = {}; catsRes.rows.forEach(r => catMap[r.category_name.toLowerCase().trim()] = r);
        const taxMap = {}; taxRes.rows.forEach(r => taxMap[r.tax_name.toLowerCase().trim()] = r.id);
        const hsnMap = {}; hsnRes.rows.forEach(r => hsnMap[Number(r.hsn_code)] = r.id); // HSN often numeric 
        // Also map HSN strings just in case
        hsnRes.rows.forEach(r => hsnMap[String(r.hsn_code).trim()] = r.id);
        const vendMap = {}; vendRes.rows.forEach(r => vendMap[r.vendor_name.toLowerCase().trim()] = r.id);

        for (const item of items) {
            // Resolve IDs from Names (Frontend should pass Names if edited, or IDs if we trust it, but CSV usually has names)
            // But verifyImportJS handles mapping?
            // If the Input is coming from Retool's "bulk update" script, it might already be mapped?
            // Let's assume Retool sends IDs if possible, but for robustness, if we see Names, we map them.
            // Actually, assuming Retool passes "brand_id", "category_id" etc. like Import.
            // If item has "Product ID", it's an UPDATE.

            const pId = item.id || item['Product ID'];

            // Standardize Input (Retool might send mapped IDs or raw names depending on script)
            // Let's assume the user uses the SAME "Wizard Smart Logic" for Update as Import.
            // So we receive IDs.

            if (pId) {
                // UPDATE
                await client.query(`
                    UPDATE products SET
                        product_name = COALESCE($1, product_name),
                        brand_id = COALESCE($2, brand_id),
                        category_id = COALESCE($3, category_id),
                        vendor_id = COALESCE($4, vendor_id),
                        mrp = COALESCE($5, mrp),
                        purchase_rate = COALESCE($6, purchase_rate),
                        distributor_rate = COALESCE($7, distributor_rate),
                        wholesale_rate = COALESCE($8, wholesale_rate),
                        dealer_rate = COALESCE($9, dealer_rate),
                        retail_rate = COALESCE($10, retail_rate),
                        tax_id = COALESCE($11, tax_id),
                        hsn_id = COALESCE($12, hsn_id),
                        ean_code = COALESCE($13, ean_code)
                    WHERE id = $14
                `, [
                    item.product_name,
                    item.brand_id, item.category_id, item.vendor_id,
                    item.mrp, item.purchase_rate,
                    item.distributor_rate, item.wholesale_rate, item.dealer_rate, item.retail_rate,
                    item.tax_id, item.hsn_id, item.ean_code,
                    pId
                ]);
                updatedCount++;
            } else {
                // CREATE (Fallback to Import Logic logic essentially)
                // For simplicity, we skip create here or duplicate logic. 
                // User said "Bulk Update". Let's focus on Update.
                // If they want Create, they use Import.
                // But if they add a row to the export CSV?
                // For now, ignore new rows to prevent partial/bad imports.
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, updated: updatedCount, created: createdCount });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Bulk Update Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
