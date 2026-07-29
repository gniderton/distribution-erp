const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/products/brands - Fetch Active Brands for Dropdowns
router.get('/brands', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, brand_name, brand_code FROM brands WHERE is_active = true ORDER BY brand_name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
        -- Virtual Columns for Real-Time Stock
        COALESCE((
            SELECT SUM(quantity_remaining) 
            FROM inventory_batches ib 
            WHERE ib.product_id = p.id AND ib.quantity_remaining > 0 AND ib.status = 'Good'
        ), 0) as current_stock,
        COALESCE((
            SELECT SUM(quantity_remaining) 
            FROM inventory_batches ib 
            WHERE ib.product_id = p.id AND ib.quantity_remaining > 0 AND ib.status = 'Damage'
        ), 0) as stock_damage,
        COALESCE((
            SELECT SUM(quantity_remaining) 
            FROM inventory_batches ib 
            WHERE ib.product_id = p.id AND ib.quantity_remaining > 0 AND ib.status = 'Expiry'
        ), 0) as stock_expiry,

        -- Valuation (FIFO/Batch-Specific)
        COALESCE((
            SELECT SUM(ib.quantity_remaining * COALESCE(ib.net_purchase_rate, ib.purchase_rate, 0)) 
            FROM inventory_batches ib 
            WHERE ib.product_id = p.id AND ib.quantity_remaining > 0 AND ib.status = 'Good'
        ), 0) as stock_value_cost,

        COALESCE((
            SELECT SUM(ib.quantity_remaining * COALESCE(ib.net_purchase_rate, ib.purchase_rate, 0) * (1 + (COALESCE(t.tax_percentage, 0) / 100.0))) 
            FROM inventory_batches ib 
            WHERE ib.product_id = p.id AND ib.quantity_remaining > 0 AND ib.status = 'Good'
        ), 0) as stock_value_gross,

        COALESCE((
            SELECT SUM(ib.quantity_initial * COALESCE(ib.net_purchase_rate, ib.purchase_rate, 0)) 
            FROM inventory_batches ib 
            WHERE ib.product_id = p.id
        ), 0) as stock_value_total_bought,

        -- 1. Total Units Bought (Ever)
        COALESCE((SELECT SUM(quantity_initial) FROM inventory_batches WHERE product_id = p.id), 0) as total_units_bought,

        -- 2. Total Units Sold (Ever)
        COALESCE((SELECT SUM(shipped_qty) FROM sales_invoice_lines WHERE product_id = p.id), 0) as total_units_sold,

        -- 3. Sales Value Taxable (Pure Revenue)
        COALESCE((SELECT SUM(taxable_amount) FROM sales_invoice_lines WHERE product_id = p.id), 0) as sales_value_taxable,

        -- 4. Exact COGS for Sold Items
        COALESCE((
            SELECT SUM(ABS(st.quantity_change) * COALESCE(ib.net_purchase_rate, ib.purchase_rate, 0)) 
            FROM stock_traceability st 
            JOIN inventory_batches ib ON ib.id = st.batch_id 
            WHERE st.product_id = p.id AND st.reference_type = 'Sales Invoice' AND st.transaction_type = 'OUT'
        ), 0) as total_cogs_value,

        -- 5. Gross Margin Amount (Sales Taxable - Exact COGS)
        (
            COALESCE((SELECT SUM(taxable_amount) FROM sales_invoice_lines WHERE product_id = p.id), 0) - 
            COALESCE((
                SELECT SUM(ABS(st.quantity_change) * COALESCE(ib.net_purchase_rate, ib.purchase_rate, 0)) 
                FROM stock_traceability st 
                JOIN inventory_batches ib ON ib.id = st.batch_id 
                WHERE st.product_id = p.id AND st.reference_type = 'Sales Invoice' AND st.transaction_type = 'OUT'
            ), 0)
        ) as margin_amount,

        -- 6. Margin Percentage
        CASE 
            WHEN COALESCE((SELECT SUM(taxable_amount) FROM sales_invoice_lines WHERE product_id = p.id), 0) > 0 
            THEN ROUND(( 
                (
                    COALESCE((SELECT SUM(taxable_amount) FROM sales_invoice_lines WHERE product_id = p.id), 0) - 
                    COALESCE((SELECT SUM(ABS(st.quantity_change) * COALESCE(ib.net_purchase_rate, ib.purchase_rate, 0)) FROM stock_traceability st JOIN inventory_batches ib ON ib.id = st.batch_id WHERE st.product_id = p.id AND st.reference_type = 'Sales Invoice' AND st.transaction_type = 'OUT'), 0)
                ) / COALESCE((SELECT SUM(taxable_amount) FROM sales_invoice_lines WHERE product_id = p.id), 1) 
            ) * 100, 2) 
            ELSE 0 
        END as margin_percentage,

        -- 7. Total Units Returned
        COALESCE((SELECT SUM(qty) FROM sales_return_lines WHERE product_id = p.id AND return_to_stock = true), 0) as total_units_returned,

        -- 8. Total Units Adjusted (Shrinkage/Gain)
        COALESCE((SELECT SUM(quantity_change) FROM stock_traceability WHERE product_id = p.id AND transaction_type = 'ADJUSTMENT'), 0) as total_units_adjusted,

        -- 9. In Transit Quantity
        COALESCE((
            SELECT SUM(sil.shipped_qty) 
            FROM sales_invoice_lines sil 
            JOIN sales_invoices si ON si.id = sil.invoice_id 
            WHERE sil.product_id = p.id AND si.delivery_status = 'In Transit'
        ), 0) as in_transit_qty,

        -- 10. Last Sold Date
        (
            SELECT MAX(si.invoice_date) 
            FROM sales_invoices si 
            JOIN sales_invoice_lines sil ON si.id = sil.invoice_id 
            WHERE sil.product_id = p.id
        ) as last_sold_date,

        -- 11. Last Purchased Date
        (SELECT MAX(created_at) FROM inventory_batches WHERE product_id = p.id) as last_purchased_date,
        
        
        b.brand_name,
        c.category_name,
        t.tax_name,
        t.tax_percentage,
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

// GET /api/products/brands - Fetch Active Brands for Dropdowns
router.get('/brands', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, brand_name FROM brands WHERE is_active = true ORDER BY brand_name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/:id/stats - Product Profile 360 Data
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Current Stock (Breakdown by Status)
        const stockRes = await pool.query(`
            SELECT 
                COALESCE(SUM(quantity_remaining) FILTER (WHERE status = 'Good'), 0) as stock_good,
                COALESCE(SUM(quantity_remaining) FILTER (WHERE status = 'Damage'), 0) as stock_damage,
                COALESCE(SUM(quantity_remaining) FILTER (WHERE status = 'Expiry'), 0) as stock_expiry,
                COALESCE(SUM(quantity_remaining), 0) as total_stock,
                json_agg(
                    json_build_object(
                        'batch_number', batch_code,
                        'qty', quantity_remaining,
                        'status', status,
                        'expiry', expiry_date,
                        'received_date', created_at
                    ) ORDER BY created_at ASC
                ) FILTER (WHERE quantity_remaining > 0) as batches
            FROM inventory_batches
            WHERE product_id = $1 AND quantity_remaining > 0
        `, [id]);

        // 2. Purchase History (Last 20)
        const historyRes = await pool.query(`
            SELECT 
                pi.received_date,
                v.vendor_name,
                pl.accepted_qty,
                pl.rate,
                ib.batch_code as batch_number
            FROM purchase_invoice_lines pl
            JOIN purchase_invoice_headers pi ON pl.purchase_invoice_header_id = pi.id
            JOIN vendors v ON pi.vendor_id = v.id
            LEFT JOIN inventory_batches ib ON ib.purchase_invoice_line_id = pl.id
            WHERE pl.product_id = $1 AND pi.status != 'Cancelled' AND pi.status != 'Reversed'
            ORDER BY pi.received_date DESC
            LIMIT 20
        `, [id]);

        const stats = stockRes.rows[0];
        const history = historyRes.rows;

        // 3. Derived Metrics
        const lastPurchase = history.length > 0 ? history[0] : null;

        res.json({
            current_stock: Number(stats.current_stock),
            last_purchase_date: lastPurchase ? lastPurchase.received_date : null,
            last_purchase_rate: lastPurchase ? Number(lastPurchase.rate) : 0,
            batches: stats.batches || [], // List for "Stock" tab
            history: history // List for "History" tab
        });

    } catch (err) {
        console.error("Product Stats Error:", err.message);
        res.status(500).json({ error: 'Server Error fetching stats' });
    }
});

// POST /api/products/batches/bulk-update - Bulk update existing batches
router.post('/batches/bulk-update', async (req, res) => {
    const client = await pool.connect();
    try {
        const { batches } = req.body;
        if (!Array.isArray(batches) || batches.length === 0) {
            return res.status(400).json({ error: "Expected an array of batches to update" });
        }

        await client.query('BEGIN');

        for (const row of batches) {
            if (!row.id) continue;
            
            await client.query(`
                UPDATE inventory_batches 
                SET 
                    batch_code = COALESCE($1, batch_code),
                    expiry_date = $2,
                    mrp = COALESCE($3, mrp),
                    purchase_rate = COALESCE($4, purchase_rate),
                    retail_rate = COALESCE($5, retail_rate),
                    wholesale_rate = COALESCE($6, wholesale_rate),
                    dealer_rate = COALESCE($7, dealer_rate),
                    distributor_rate = COALESCE($8, distributor_rate),
                    updated_at = NOW()
                WHERE id = $9
            `, [
                row.batch_code || null,
                row.expiry_date || null,
                row.mrp !== undefined ? parseFloat(row.mrp) : null,
                row.purchase_rate !== undefined ? parseFloat(row.purchase_rate) : null,
                row.retail_rate !== undefined ? parseFloat(row.retail_rate) : null,
                row.wholesale_rate !== undefined ? parseFloat(row.wholesale_rate) : null,
                row.dealer_rate !== undefined ? parseFloat(row.dealer_rate) : null,
                row.distributor_rate !== undefined ? parseFloat(row.distributor_rate) : null,
                parseInt(row.id, 10)
            ]);
        }

        await client.query('COMMIT');
        res.json({ message: "Batches bulk updated successfully" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Bulk Batch Update Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// POST /api/products/batches/legacy-bulk - Create legacy batches with 0 quantity
router.post('/batches/legacy-bulk', async (req, res) => {
    const client = await pool.connect();
    try {
        const { batches } = req.body;
        if (!Array.isArray(batches) || batches.length === 0) {
            return res.status(400).json({ error: "Expected an array of batches" });
        }

        await client.query('BEGIN');
        let importedCount = 0;

        for (const row of batches) {
            await client.query(`
                INSERT INTO inventory_batches (
                    product_id, batch_code, expiry_date, 
                    quantity_initial, quantity_remaining, 
                    mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate,
                    status, created_at
                ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            `, [
                parseInt(row.product_id, 10), 
                row.batch_code || 'LEGACY-BATCH', 
                row.expiry_date || null,
                0, // HARDCODED TO 0 FOR LEGACY BATCHES
                parseFloat(row.mrp) || 0,
                parseFloat(row.purchase_rate) || 0,
                parseFloat(row.distributor_rate) || 0,
                parseFloat(row.wholesale_rate) || 0,
                parseFloat(row.dealer_rate) || 0,
                parseFloat(row.retail_rate) || 0,
                'Good'
            ]);
            importedCount++;
        }

        await client.query('COMMIT');
        res.json({ 
            success: true, 
            count: importedCount, 
            message: `Created ${importedCount} legacy batches successfully.` 
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Legacy Batch Creation Error:', err);
        res.status(500).json({ error: err.message });
    } finally { 
        client.release(); 
    }
});

// GET /api/products/batches - Global fetch for all products
router.get('/batches', async (req, res) => {
    try {
        const { stock_type = 'all', product_ids } = req.query;

        let query = `
            SELECT 
                id, product_id, batch_code, mrp, expiry_date, quantity_remaining, purchase_rate, status,
                distributor_rate, wholesale_rate, dealer_rate, retail_rate, grn_id
            FROM inventory_batches
            WHERE 1=1
        `;

        const params = [];
        let paramIdx = 1;

        if (product_ids) {
            const ids = product_ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
            if (ids.length > 0) {
                query += ` AND product_id = ANY($${paramIdx})`;
                params.push(ids);
                paramIdx++;
            }
        }

        if (stock_type === 'non-zero') {
            query += ` AND quantity_remaining > 0`;
        }

        query += ` ORDER BY product_id, created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error("Global Batches Fetch Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/:id/batches - Fetch available inventory batches for a product with margins
router.get('/:id/batches', async (req, res) => {
    try {
        const { id } = req.params;
        const { stock_type = 'all' } = req.query; // all, non-zero, zero

        let query = `
            SELECT 
                id, batch_code, mrp, expiry_date, quantity_remaining, purchase_rate, status,
                distributor_rate, wholesale_rate, dealer_rate, retail_rate,
                -- 📐 Calculated Margin Percentages (Rounded to 2 Decimals)
                ROUND(CASE WHEN purchase_rate > 0 THEN ((distributor_rate - purchase_rate) / purchase_rate) * 100 ELSE 0 END, 2) as distributor_margin_pct,
                ROUND(CASE WHEN purchase_rate > 0 THEN ((wholesale_rate - purchase_rate) / purchase_rate) * 100 ELSE 0 END, 2) as wholesale_margin_pct,
                ROUND(CASE WHEN purchase_rate > 0 THEN ((dealer_rate - purchase_rate) / purchase_rate) * 100 ELSE 0 END, 2) as dealer_margin_pct,
                ROUND(CASE WHEN purchase_rate > 0 THEN ((retail_rate - purchase_rate) / purchase_rate) * 100 ELSE 0 END, 2) as retail_margin_pct
            FROM inventory_batches
            WHERE product_id = $1
        `;

        const params = [id];

        // 🎯 Stock Filtering Logic
        if (stock_type === 'non-zero') {
            query += ` AND quantity_remaining > 0`;
        } else if (stock_type === 'zero') {
            query += ` AND quantity_remaining <= 0`;
        }

        query += ` ORDER BY created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch Product Batches Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 27b. PUT /api/products/batches/:id - Update batch details with recalculated margins
router.put('/batches/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 0. Flatten the body if it comes from a Sectioned JSON Form
        let flatBody = { ...req.body };
        Object.keys(flatBody).forEach(key => {
            if (typeof flatBody[key] === 'object' && flatBody[key] !== null && !Array.isArray(flatBody[key])) {
                flatBody = { ...flatBody, ...flatBody[key] };
                delete flatBody[key];
            }
        });

        const {
            batch_code, mrp, expiry_date, purchase_rate,
            distributor_rate, wholesale_rate, dealer_rate, retail_rate, status
        } = flatBody;

        // 1. Update the record
        await pool.query(`
            UPDATE inventory_batches SET
                batch_code = COALESCE($1, batch_code),
                mrp = COALESCE($2, mrp),
                expiry_date = COALESCE($3, expiry_date),
                purchase_rate = COALESCE($4, purchase_rate),
                distributor_rate = COALESCE($5, distributor_rate),
                wholesale_rate = COALESCE($6, wholesale_rate),
                dealer_rate = COALESCE($7, dealer_rate),
                retail_rate = COALESCE($8, retail_rate),
                status = COALESCE($9, status)
            WHERE id = $10
        `, [
            batch_code, mrp, expiry_date, purchase_rate,
            distributor_rate, wholesale_rate, dealer_rate, retail_rate, status,
            id
        ]);

        // 2. Fetch the updated row with same margin calculation as the GET list
        const updatedRes = await pool.query(`
            SELECT 
                id, batch_code, mrp, expiry_date, quantity_remaining, purchase_rate, status, product_id,
                distributor_rate, wholesale_rate, dealer_rate, retail_rate,
                ROUND(CASE WHEN purchase_rate > 0 THEN ((distributor_rate - purchase_rate) / purchase_rate) * 100 ELSE 0 END, 2) as distributor_margin_pct,
                ROUND(CASE WHEN purchase_rate > 0 THEN ((wholesale_rate - purchase_rate) / purchase_rate) * 100 ELSE 0 END, 2) as wholesale_margin_pct,
                ROUND(CASE WHEN purchase_rate > 0 THEN ((dealer_rate - purchase_rate) / purchase_rate) * 100 ELSE 0 END, 2) as dealer_margin_pct,
                ROUND(CASE WHEN purchase_rate > 0 THEN ((retail_rate - purchase_rate) / purchase_rate) * 100 ELSE 0 END, 2) as retail_margin_pct
            FROM inventory_batches
            WHERE id = $1
        `, [id]);

        res.json({ success: true, batch: updatedRes.rows[0] });

    } catch (err) {
        console.error("Edit Product Batch Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products
// POST /api/products
router.post('/', async (req, res) => {
    // 0. Flatten the body if it's coming from a Sectioned JSON Form
    let flatBody = { ...req.body };
    Object.keys(flatBody).forEach(key => {
        if (typeof flatBody[key] === 'object' && flatBody[key] !== null && !Array.isArray(flatBody[key])) {
            flatBody = { ...flatBody, ...flatBody[key] };
            delete flatBody[key];
        }
    });

    let {
        vendor_id, product_name, brand_id, category_id,
        hsn_id, tax_id,
        mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate,
        case_quantity, uom, model_number, min_stock_level,
        box_length_cm, box_width_cm, box_height_cm, weight_kg, description, ean_code
    } = flatBody;

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
            case_quantity, uom, model_number, min_stock_level,
            box_length_cm, box_width_cm, box_height_cm, weight_kg, description,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, true)
          RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            vendor_id, brand_id, category_id, product_code, product_name,
            hsn_id || null, tax_id || null, ean_code || null,
            mrp, purchase_rate,
            distributor_rate || 0, wholesale_rate || 0, dealer_rate || 0, retail_rate || 0,
            case_quantity || 1, uom || 'Pcs', model_number || null, min_stock_level || 0,
            box_length_cm || null, box_width_cm || null, box_height_cm || null, weight_kg || null, description || null
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
                    case_quantity, uom, model_number, min_stock_level,
                    box_length_cm, box_width_cm, box_height_cm, weight_kg, description,
                    is_active
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, true)
                `;

                await client.query(query, [
                    item.vendor_id, item.brand_id, item.category_id, product_code, item.product_name,
                    item.ean_code || null,
                    item.hsn_id || null, item.tax_id || null,
                    item.mrp || 0, item.purchase_rate || 0,
                    item.distributor_rate || 0, item.wholesale_rate || 0, item.dealer_rate || 0, item.retail_rate || 0,
                    item.case_quantity || 1, item.uom || 'Pcs', item.model_number || null, item.min_stock_level || 0,
                    item.box_length_cm || null, item.box_width_cm || null, item.box_height_cm || null, item.weight_kg || null, item.description || null
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
                p.ean_code as "EAN",
                p.case_quantity as "Case Qty",
                p.uom as "UOM",
                p.model_number as "Model Number",
                p.min_stock_level as "Min Stock",
                p.box_length_cm as "Length(cm)",
                p.box_width_cm as "Width(cm)",
                p.box_height_cm as "Height(cm)",
                p.weight_kg as "Weight(kg)",
                p.description as "Description"
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN vendors v ON p.vendor_id = v.id
            LEFT JOIN taxes t ON p.tax_id = t.id
            LEFT JOIN hsn_codes h ON p.hsn_id = h.id
            WHERE p.is_active = true
            ORDER BY p.id ASC
        `;

        let queryText = `
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
                p.ean_code as "EAN",
                p.case_quantity as "Case Qty",
                p.uom as "UOM",
                p.model_number as "Model Number",
                p.min_stock_level as "Min Stock",
                p.box_length_cm as "Length(cm)",
                p.box_width_cm as "Width(cm)",
                p.box_height_cm as "Height(cm)",
                p.weight_kg as "Weight(kg)",
                p.description as "Description"
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN vendors v ON p.vendor_id = v.id 
            LEFT JOIN taxes t ON p.tax_id = t.id
            LEFT JOIN hsn_codes h ON p.hsn_id = h.id
            WHERE p.is_active = true
        `;

        const filterValues = [];
        if (req.query.brand_id) {
            queryText += ` AND p.brand_id = $1`;
            filterValues.push(req.query.brand_id);
        }

        queryText += ` ORDER BY p.id ASC`;

        const { rows } = await pool.query(queryText, filterValues);

        // Convert to CSV
        if (rows.length === 0) {
            return res.send("Product ID,Product Name,Brand Name,Category Name,Vendor Name,MRP,Purchase Rate,Distributor Rate,Wholesale Rate,Dealer Rate,Retail Rate,Tax Name,HSN Code,EAN,Case Qty,UOM,Model Number,Min Stock,Length(cm),Width(cm),Height(cm),Weight(kg),Description");
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
        console.log("Bulk Update Received:", items.length, "items");
        if (items.length > 0) console.log("Sample Item:", items[0]);

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

        // 1. Build Optimization Map: Name -> ID AND ID -> ID
        const buildMap = (rows, nameField, idField) => {
            const map = {};
            rows.forEach(r => {
                if (r[nameField]) map[String(r[nameField]).toLowerCase().trim()] = r[idField];
                map[String(r[idField])] = r[idField];
            });
            return map;
        };

        const brandMap = buildMap(brandsRes.rows, 'brand_name', 'id');
        const catMap = buildMap(catsRes.rows, 'category_name', 'id');
        const taxMap = buildMap(taxRes.rows, 'tax_name', 'id');
        const hsnMap = buildMap(hsnRes.rows, 'hsn_code', 'id');
        const vendMap = buildMap(vendRes.rows, 'vendor_name', 'id');

        const updates = [];
        const newItems = [];

        for (const item of items) {
            const pId = item.id || item['Product ID'];
            if (pId) {
                updates.push({ ...item, id: pId });
            } else {
                newItems.push(item);
            }
        }

        // --- HELPER FUNCTIONS ---
        const safeNum = (val) => (val === '' || val === null || val === undefined) ? null : val;

        // Resolve ID from Value (Value can be ID or Name or Numeric String)
        const safeId = (val, map) => {
            if (!val) return null;
            const key = String(val).toLowerCase().trim();
            return map[key] || null;
        };

        // --- PROCESS UPDATES ---
        if (updates.length > 0) {
            const values = [];
            let paramIdx = 1;
            const valuePlaceholders = [];

            for (const u of updates) {
                valuePlaceholders.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8}, $${paramIdx + 9}, $${paramIdx + 10}, $${paramIdx + 11}, $${paramIdx + 12}, $${paramIdx + 13}, $${paramIdx + 14}, $${paramIdx + 15}, $${paramIdx + 16}, $${paramIdx + 17}, $${paramIdx + 18}, $${paramIdx + 19}, $${paramIdx + 20}, $${paramIdx + 21}, $${paramIdx + 22})`);

                values.push(
                    u.id,
                    u.product_name,
                    safeId(u.brand_id, brandMap),
                    safeId(u.category_id, catMap),
                    safeId(u.vendor_id, vendMap),
                    safeNum(u.mrp), safeNum(u.purchase_rate),
                    safeNum(u.distributor_rate), safeNum(u.wholesale_rate), safeNum(u.dealer_rate), safeNum(u.retail_rate),
                    safeId(u.tax_id, taxMap),
                    safeId(u.hsn_id, hsnMap),
                    u.ean_code,
                    safeNum(u.case_quantity), u.uom, u.model_number, safeNum(u.min_stock_level),
                    safeNum(u.box_length_cm), safeNum(u.box_width_cm), safeNum(u.box_height_cm), safeNum(u.weight_kg), u.description
                );
                paramIdx += 23;
            }

            // Fetch existing prices for comparison
            const productIds = updates.map(u => u.id).filter(id => id && !isNaN(id));
            const existingRes = await client.query(
                'SELECT id, mrp, distributor_rate, wholesale_rate, dealer_rate, retail_rate FROM products WHERE id = ANY($1::bigint[])',
                [productIds]
            );
            const existingMap = {};
            existingRes.rows.forEach(r => {
                existingMap[r.id] = r;
            });

            const query = `
                UPDATE products AS p
                SET
                    product_name = COALESCE(v.product_name, p.product_name),
                    brand_id = COALESCE(NULLIF(v.brand_id::bigint, 0), p.brand_id),
                    category_id = COALESCE(NULLIF(v.category_id::bigint, 0), p.category_id),
                    vendor_id = COALESCE(NULLIF(v.vendor_id::bigint, 0), p.vendor_id),
                    mrp = COALESCE(v.mrp::numeric, p.mrp),
                    purchase_rate = COALESCE(v.purchase_rate::numeric, p.purchase_rate),
                    distributor_rate = COALESCE(v.distributor_rate::numeric, p.distributor_rate),
                    wholesale_rate = COALESCE(v.wholesale_rate::numeric, p.wholesale_rate),
                    dealer_rate = COALESCE(v.dealer_rate::numeric, p.dealer_rate),
                    retail_rate = COALESCE(v.retail_rate::numeric, p.retail_rate),
                    tax_id = COALESCE(NULLIF(v.tax_id::bigint, 0), p.tax_id),
                    hsn_id = COALESCE(NULLIF(v.hsn_id::bigint, 0), p.hsn_id),
                    ean_code = COALESCE(v.ean_code, p.ean_code),
                    case_quantity = COALESCE(v.case_quantity::integer, p.case_quantity),
                    uom = COALESCE(v.uom, p.uom),
                    model_number = COALESCE(v.model_number, p.model_number),
                    min_stock_level = COALESCE(v.min_stock_level::integer, p.min_stock_level),
                    box_length_cm = COALESCE(v.box_length_cm::numeric, p.box_length_cm),
                    box_width_cm = COALESCE(v.box_width_cm::numeric, p.box_width_cm),
                    box_height_cm = COALESCE(v.box_height_cm::numeric, p.box_height_cm),
                    weight_kg = COALESCE(v.weight_kg::numeric, p.weight_kg),
                    description = COALESCE(v.description, p.description)
                FROM (VALUES 
                    ${valuePlaceholders.join(', ')}
                ) AS v(
                    id, product_name, brand_id, category_id, vendor_id, 
                    mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate, 
                    tax_id, hsn_id, ean_code,
                    case_quantity, uom, model_number, min_stock_level,
                    box_length_cm, box_width_cm, box_height_cm, weight_kg, description
                )
                WHERE p.id = v.id::bigint
                RETURNING p.id, p.mrp, p.distributor_rate, p.wholesale_rate, p.dealer_rate, p.retail_rate
            `;

            const result = await client.query(query, values);

            // Compare rates and log changes
            const alertsToInsert = [];
            for (const row of result.rows) {
                const old = existingMap[row.id];
                if (!old) continue;
                
                const hasChanged = 
                    parseFloat(old.mrp || 0) !== parseFloat(row.mrp || 0) ||
                    parseFloat(old.distributor_rate || 0) !== parseFloat(row.distributor_rate || 0) ||
                    parseFloat(old.wholesale_rate || 0) !== parseFloat(row.wholesale_rate || 0) ||
                    parseFloat(old.dealer_rate || 0) !== parseFloat(row.dealer_rate || 0) ||
                    parseFloat(old.retail_rate || 0) !== parseFloat(row.retail_rate || 0);

                if (hasChanged) {
                    alertsToInsert.push({
                        product_id: row.id,
                        old_mrp: old.mrp,
                        new_mrp: row.mrp,
                        old_distributor_rate: old.distributor_rate,
                        new_distributor_rate: row.distributor_rate,
                        old_wholesale_rate: old.wholesale_rate,
                        new_wholesale_rate: row.wholesale_rate,
                        old_dealer_rate: old.dealer_rate,
                        new_dealer_rate: row.dealer_rate,
                        old_retail_rate: old.retail_rate,
                        new_retail_rate: row.retail_rate
                    });
                }
            }

            if (alertsToInsert.length > 0) {
                const insertValues = [];
                const insertPlaceholders = [];
                let pIdx = 1;
                for (const a of alertsToInsert) {
                    insertPlaceholders.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6}, $${pIdx+7}, $${pIdx+8}, $${pIdx+9}, $${pIdx+10})`);
                    insertValues.push(
                        a.product_id,
                        a.old_mrp, a.new_mrp,
                        a.old_distributor_rate, a.new_distributor_rate,
                        a.old_wholesale_rate, a.new_wholesale_rate,
                        a.old_dealer_rate, a.new_dealer_rate,
                        a.old_retail_rate, a.new_retail_rate
                    );
                    pIdx += 11;
                }
                const insertQuery = `
                    INSERT INTO product_price_alerts (
                        product_id,
                        old_mrp, new_mrp,
                        old_distributor_rate, new_distributor_rate,
                        old_wholesale_rate, new_wholesale_rate,
                        old_dealer_rate, new_dealer_rate,
                        old_retail_rate, new_retail_rate
                    ) VALUES ${insertPlaceholders.join(', ')}
                `;
                await client.query(insertQuery, insertValues);
            }

            updatedCount = updates.length;
        }

        // --- PROCESS NEW ITEMS (CREATE) ---
        // User requested strict separation: Bulk Update is ONLY for editing.
        // We implicitly ignore items without IDs here.
        if (newItems.length > 0) {
            console.log(`Bulk Update: Ignoring ${newItems.length} items without IDs (Update Only Mode).`);
        }

        await client.query('COMMIT');
        // Return 0 created count to be explicit
        res.json({ success: true, updated: updatedCount, created: 0 });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Bulk Update Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// PUT /api/products/:id - Single Product Update (For JSON Form)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 0. Flatten the body if it's coming from a Sectioned JSON Form
        let flatBody = { ...req.body };
        Object.keys(flatBody).forEach(key => {
            if (typeof flatBody[key] === 'object' && flatBody[key] !== null && !Array.isArray(flatBody[key])) {
                flatBody = { ...flatBody, ...flatBody[key] };
                delete flatBody[key];
            }
        });

        const {
            product_name, product_code, ean_code,
            mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate,
            is_active, case_quantity, uom, model_number, min_stock_level,
            box_length_cm, box_width_cm, box_height_cm, weight_kg, description,
            brand_id, category_id, tax_id, hsn_id // These come directly from Select widgets
        } = flatBody;

        // Query existing prices to check for differences
        const currentRes = await pool.query(
            'SELECT mrp, distributor_rate, wholesale_rate, dealer_rate, retail_rate FROM products WHERE id = $1',
            [id]
        );
        const oldPrices = currentRes.rows[0];

        const updateQuery = `
            UPDATE products 
            SET 
                product_name = COALESCE($1, product_name),
                product_code = COALESCE($2, product_code),
                ean_code = COALESCE($3, ean_code),
                mrp = COALESCE($4::numeric, mrp),
                purchase_rate = COALESCE($5::numeric, purchase_rate),
                distributor_rate = COALESCE($6::numeric, distributor_rate),
                wholesale_rate = COALESCE($7::numeric, wholesale_rate),
                dealer_rate = COALESCE($8::numeric, dealer_rate),
                retail_rate = COALESCE($9::numeric, retail_rate),
                is_active = COALESCE($10::boolean, is_active),
                case_quantity = COALESCE($11::integer, case_quantity),
                uom = COALESCE($12, uom),
                model_number = COALESCE($13, model_number),
                min_stock_level = COALESCE($14::integer, min_stock_level),
                box_length_cm = COALESCE($15::numeric, box_length_cm),
                box_width_cm = COALESCE($16::numeric, box_width_cm),
                box_height_cm = COALESCE($17::numeric, box_height_cm),
                weight_kg = COALESCE($18::numeric, weight_kg),
                description = COALESCE($19, description),
                brand_id = COALESCE($20::bigint, brand_id),
                category_id = COALESCE($21::bigint, category_id),
                tax_id = COALESCE($22::bigint, tax_id),
                hsn_id = COALESCE($23::bigint, hsn_id)
            WHERE id = $24
            RETURNING *
        `;

        const values = [
            product_name, product_code, ean_code,
            mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate,
            is_active, case_quantity, uom, model_number, min_stock_level,
            box_length_cm, box_width_cm, box_height_cm, weight_kg, description,
            brand_id, category_id, tax_id, hsn_id,
            id
        ];

        const result = await pool.query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const newProduct = result.rows[0];

        // Compare prices and record alert if anything changed
        if (oldPrices) {
            const hasChanged = 
                parseFloat(oldPrices.mrp || 0) !== parseFloat(newProduct.mrp || 0) ||
                parseFloat(oldPrices.distributor_rate || 0) !== parseFloat(newProduct.distributor_rate || 0) ||
                parseFloat(oldPrices.wholesale_rate || 0) !== parseFloat(newProduct.wholesale_rate || 0) ||
                parseFloat(oldPrices.dealer_rate || 0) !== parseFloat(newProduct.dealer_rate || 0) ||
                parseFloat(oldPrices.retail_rate || 0) !== parseFloat(newProduct.retail_rate || 0);

            if (hasChanged) {
                await pool.query(`
                    INSERT INTO product_price_alerts (
                        product_id,
                        old_mrp, new_mrp,
                        old_distributor_rate, new_distributor_rate,
                        old_wholesale_rate, new_wholesale_rate,
                        old_dealer_rate, new_dealer_rate,
                        old_retail_rate, new_retail_rate
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    id,
                    oldPrices.mrp, newProduct.mrp,
                    oldPrices.distributor_rate, newProduct.distributor_rate,
                    oldPrices.wholesale_rate, newProduct.wholesale_rate,
                    oldPrices.dealer_rate, newProduct.dealer_rate,
                    oldPrices.retail_rate, newProduct.retail_rate
                ]);
            }
        }

        res.json({ success: true, product: newProduct });

    } catch (err) {
        console.error("Product Update Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products/bulk-status - Bulk Update Product Active Status
router.post('/bulk-status', async (req, res) => {
    try {
        const { ids, is_active } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "ids must be a non-empty array of numbers" });
        }
        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ error: "is_active must be a boolean value" });
        }

        const updateQuery = `
            UPDATE products
            SET is_active = $1
            WHERE id = ANY($2::bigint[])
            RETURNING id, product_name, product_code, is_active
        `;

        const result = await pool.query(updateQuery, [is_active, ids]);

        res.json({
            success: true,
            updated_count: result.rowCount,
            products: result.rows
        });
    } catch (err) {
        console.error("Bulk Status Update Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
