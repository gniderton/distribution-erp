const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { calculateFreeItems } = require('../utils/schemeEngine'); // [NEW] Import

// --- SALES ORDERS (Header/Lines) ---

// GET /api/sales/orders - List Orders
router.get('/orders', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        let query = `
            SELECT 
                so.*,
                c.customer_name,
                e.full_name as created_by_name,
                (SELECT COUNT(*) FROM sales_order_lines sol WHERE sol.sales_order_id = so.id) as line_count
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id
            LEFT JOIN employees e ON so.created_by = e.id
        `;
        const params = [];
        let pIdx = 1;

        if (status) {
            query += ` WHERE so.status = $${pIdx}`;
            params.push(status);
            pIdx++;
        }

        query += ` ORDER BY so.created_at DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/sales/invoices - List Invoices (Filtered)
router.get('/invoices', async (req, res) => {
    try {
        const { limit = 50, offset = 0, route_id, date, days } = req.query;

        let query = `
            SELECT si.*, c.customer_name, so.so_number
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            JOIN sales_orders so ON si.sales_order_id = so.id
        `;

        const params = [];
        const where = [];
        let pIdx = 1;

        if (route_id) {
            where.push(`c.route_id = $${pIdx}`);
            params.push(route_id);
            pIdx++;
        }

        if (date) {
            where.push(`si.invoice_date = $${pIdx}`);
            params.push(date);
            pIdx++;
        }

        // Logic: "Past Data" e.g. last 7 days from NOW
        if (days) {
            where.push(`si.invoice_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'`);
        }

        if (where.length > 0) query += ` WHERE ${where.join(' AND ')}`;

        query += ` ORDER BY si.created_at DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/sales/invoices/lines-bulk - Get lines for multiple invoices
router.get('/invoices/lines-bulk', async (req, res) => {
    try {
        const { ids, schemeId, schemeName } = req.query; // Comma-separated IDs
        if (!ids) return res.json([]);
        
        const idList = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        if (idList.length === 0) return res.json([]);

        let filterClause = "";
        let params = [idList];

        if (schemeId || schemeName) {
            const p1 = schemeId ? `%[ID:${schemeId}]%` : null;
            const p2 = schemeName ? `%${schemeName}%` : null;
            
            if (p1 && p2) {
                filterClause = " AND (sil.tier_applied ILIKE $2 OR sil.tier_applied ILIKE $3) ";
                params.push(p1, p2);
            } else if (p1) {
                filterClause = " AND sil.tier_applied ILIKE $2 ";
                params.push(p1);
            } else if (p2) {
                filterClause = " AND sil.tier_applied ILIKE $2 ";
                params.push(p2);
            }
        }

        const query = `
            SELECT 
                sil.*, 
                p.product_name, p.product_code, p.ean_code,
                h.hsn_code,
                si.invoice_number, si.invoice_date, si.grand_total,
                c.customer_name, ca.address_line1 as customer_address, c.gstin as gstin, c.customer_phone as customer_phone, c.email as customer_email,
                so.order_date as order_date,
                e.full_name as dse_name,
                r.route_name as route
            FROM sales_invoice_lines sil
            JOIN products p ON sil.product_id = p.id
            LEFT JOIN hsn_codes h ON p.hsn_id = h.id
            JOIN sales_invoices si ON sil.invoice_id = si.id
            LEFT JOIN customers c ON si.customer_id = c.id
            LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_default_billing = true
            LEFT JOIN sales_orders so ON si.sales_order_id = so.id
            LEFT JOIN employees e ON so.dse_id = e.id
            LEFT JOIN routes r ON c.route_id = r.id
            WHERE sil.invoice_id = ANY($1::int[])
            ${filterClause}
            ORDER BY si.invoice_number ASC, sil.id ASC
        `;

        const result = await pool.query(query, params);

        res.json(result.rows);
    } catch (err) {
        console.error('Bulk Lines Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/sales/invoices/:id - Detailed Invoice for Printing
router.get('/invoices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            // 1. Fetch Header + Customer + Company Info
            const headerRes = await client.query(`
                SELECT 
                    si.*, 
                    c.customer_name, ca.address_line1 as customer_address, c.gstin as customer_gst, c.customer_phone as customer_phone,
                    so.so_number, so.order_date as so_date, so.remarks as so_remarks,
                    e.full_name as dse_name,
                    r.route_name,
                    (SELECT json_build_object(
                        'name', company_name, 
                        'gstin', gstin, 
                        'state_code', state_code
                    ) FROM company_settings LIMIT 1) as company
                FROM sales_invoices si
                JOIN customers c ON si.customer_id = c.id
                LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_default_billing = true
                JOIN sales_orders so ON si.sales_order_id = so.id
                LEFT JOIN employees e ON so.created_by = e.id
                LEFT JOIN routes r ON c.route_id = r.id
                WHERE si.id = $1
            `, [id]);

            if (headerRes.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
            const header = headerRes.rows[0];

            // 2. Fetch Lines from the new sales_invoice_lines table
            const linesRes = await client.query(`
                SELECT 
                    sil.*, 
                    p.product_name, p.product_code, p.ean_code,
                    h.hsn_code,
                    t.tax_percentage as master_tax_pct
                FROM sales_invoice_lines sil
                JOIN products p ON sil.product_id = p.id
                LEFT JOIN hsn_codes h ON p.hsn_id = h.id
                LEFT JOIN taxes t ON p.tax_id = t.id
                WHERE sil.invoice_id = $1
                ORDER BY sil.id ASC
            `, [id]);

            res.json({
                ...header,
                lines: linesRes.rows
            });
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/sales/returns - List Sales Returns (Filtered)
router.get('/returns', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0, route_id, days } = req.query;
        let query = `
            SELECT sr.*, c.customer_name
            FROM sales_returns sr
            JOIN customers c ON sr.customer_id = c.id
        `;
        const params = [];
        const where = [];
        let pIdx = 1;

        if (status) {
            where.push(`sr.status = $${pIdx}`);
            params.push(status);
            pIdx++;
        }

        if (route_id) {
            where.push(`c.route_id = $${pIdx}`);
            params.push(route_id);
            pIdx++;
        }

        if (req.query.customer_id) {
            where.push(`sr.customer_id = $${pIdx}`);
            params.push(req.query.customer_id);
            pIdx++;
        }

        // Default filter logic (e.g. <= 7 days) if requested
        if (days) {
            where.push(`sr.return_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'`);
        }

        if (where.length > 0) query += ` WHERE ${where.join(' AND ')}`;

        query += ` ORDER BY sr.created_at DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/sales/orders/:id - Single Order Detail
router.get('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            const headerRes = await client.query(`
                SELECT so.*, c.customer_name, c.customer_phone, c.gstin,
                       r.route_name
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.id
                LEFT JOIN routes r ON c.route_id = r.id
                WHERE so.id = $1
            `, [id]);

            if (headerRes.rows.length === 0) return res.status(404).json({ error: 'Order Not Found' });

            const linesRes = await client.query(`
                SELECT sol.*, p.product_name, p.product_code
                FROM sales_order_lines sol
                JOIN products p ON sol.product_id = p.id
                WHERE sol.sales_order_id = $1
            `, [id]);

            res.json({ header: headerRes.rows[0], lines: linesRes.rows });
        } finally {
            client.release();
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/sales/orders - Create New Order
router.post('/orders', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            customer_id, dse_id, order_date, delivery_date, items,
            remarks, payment_instruction, special_instruction,
            location_lat, location_lng // [NEW] GPS
        } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ error: 'No items in order' });

        await client.query('BEGIN');

        // 1. Generate SO Number (SO-YY-SEQ)
        const yy = new Date().getFullYear().toString().slice(-2);
        const seqRes = await client.query("SELECT COUNT(*) FROM sales_orders WHERE so_number LIKE $1", [`SO-${yy}-%`]);
        const nextSeq = parseInt(seqRes.rows[0].count) + 1;
        const soNumber = `SO-${yy}-${String(nextSeq).padStart(4, '0')}`;

        // 2. Insert Header
        const headRes = await client.query(`
            INSERT INTO sales_orders (
                so_number, customer_id, created_by, order_date, delivery_date, 
                status, remarks, payment_instruction, special_instruction,
                location_lat, location_lng
            ) VALUES ($1, $2, $3, $4, $5, 'Draft', $6, $7, $8, $9, $10)
            RETURNING id
        `, [
            soNumber, customer_id, dse_id, order_date || new Date(), delivery_date,
            remarks, payment_instruction, special_instruction,
            location_lat, location_lng
        ]);
        const soId = headRes.rows[0].id;

        let totalAmt = 0;
        let totalTax = 0;

        // 3. Insert Lines
        for (const item of items) {
            // item: { product_id, qty, rate, tax_pct }
            const qty = Number(item.qty);
            const rate = Number(item.rate);
            const taxPct = Number(item.tax_pct || 0); // Logic: rate is exclusive or inclusive? Assuming Exclusive for B2B usually, but let's calculate standard

            const gross = qty * rate;
            const taxAmt = gross * (taxPct / 100);
            const lineTotal = gross + taxAmt;

            await client.query(`
                INSERT INTO sales_order_lines (
                    sales_order_id, product_id, ordered_qty, rate, 
                    tax_percent, tax_amount, amount, tier_applied
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                soId, item.product_id, qty, rate,
                taxPct, taxAmt, lineTotal, item.tier_applied || 'Manual'
            ]);

            totalAmt += lineTotal;
            totalTax += taxAmt;
        }

        // 4. Update Header Totals
        await client.query('UPDATE sales_orders SET total_amount = $1, tax_amount = $2 WHERE id = $3', [totalAmt, totalTax, soId]);

        await client.query('COMMIT');
        res.status(201).json({ success: true, so_number: soNumber, id: soId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// POST /api/sales/orders/bulk - Sync Multiple Orders (Offline Mode)
router.post('/orders/bulk', async (req, res) => {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) return res.status(400).json({ error: 'Invalid orders array' });

    const client = await pool.connect();
    const results = [];

    try {
        for (const order of orders) {
            try {
                await client.query('BEGIN');

                // 1. Generate SO Number
                const yy = new Date().getFullYear().toString().slice(-2);
                const seqRes = await client.query("SELECT COUNT(*) FROM sales_orders WHERE so_number LIKE $1", [`SO-${yy}-%`]);
                const nextSeq = parseInt(seqRes.rows[0].count) + 1;
                const soNumber = `SO-${yy}-${String(nextSeq).padStart(4, '0')}`;

                // 2. Insert Header
                const headRes = await client.query(`
                    INSERT INTO sales_orders (
                        so_number, customer_id, created_by, order_date, delivery_date, 
                        status, remarks, payment_instruction, special_instruction,
                        location_lat, location_lng
                    ) VALUES ($1, $2, $3, $4, $5, 'Draft', $6, $7, $8, $9, $10)
                    RETURNING id
                `, [
                    soNumber, order.customer_id, order.dse_id, order.order_date || new Date(), order.delivery_date,
                    order.remarks, order.payment_instruction, order.special_instruction,
                    order.location_lat, order.location_lng
                ]);
                const soId = headRes.rows[0].id;

                let totalAmt = 0;
                let totalTax = 0;

                // 3. Insert Lines
                for (const item of order.items) {
                    const qty = Number(item.qty);
                    const rate = Number(item.rate);
                    const taxPct = Number(item.tax_pct || 0);

                    const gross = qty * rate;
                    const taxAmt = gross * (taxPct / 100);
                    const lineTotal = gross + taxAmt;

                    await client.query(`
                        INSERT INTO sales_order_lines (
                            sales_order_id, product_id, ordered_qty, rate, 
                            tax_percent, tax_amount, amount, tier_applied
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        soId, item.product_id, qty, rate,
                        taxPct, taxAmt, lineTotal, item.tier_applied || 'Manual'
                    ]);

                    totalAmt += lineTotal;
                    totalTax += taxAmt;
                }

                // 4. Update Header Totals
                await client.query('UPDATE sales_orders SET total_amount = $1, tax_amount = $2 WHERE id = $3', [totalAmt, totalTax, soId]);

                await client.query('COMMIT');
                results.push({ tempId: order.tempId, success: true, so_number: soNumber, id: soId });

            } catch (err) {
                await client.query('ROLLBACK');
                results.push({ tempId: order.tempId, success: false, error: err.message });
            }
        }
        res.json({ success: true, results });
    } finally {
        client.release();
    }
});


// --- STOCK ALLOCATION LOGIC (Existing preserved) ---
// Used by Frontend to check "Can I fulfill this?"
router.post('/allocate', async (req, res) => {
    const client = await pool.connect();
    try {
        const { items } = req.body;
        // ... (Existing Logic preserved for Dispatch Phase) ...
        // Re-implementing simplified version for context:
        if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Invalid items' });

        const results = [];
        for (const item of items) {
            const batchesRes = await client.query(`
                SELECT id, batch_code, quantity_remaining, purchase_rate, mrp
                FROM inventory_batches 
                WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true AND status = 'Good'
                ORDER BY created_at ASC
            `, [item.product_id]);

            results.push({
                product_id: item.product_id,
                qty_requested: item.qty,
                available_batches: batchesRes.rows
            });
        }
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- DISPATCH & INVOICE LOGIC ---

// POST /api/sales/orders/:id/dispatch - Verify & Create Invoice
router.post('/orders/:id/dispatch', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { invoice_date } = req.body;

        await client.query('BEGIN');

        // 1. Fetch Order & Lines
        const soRes = await client.query('SELECT * FROM sales_orders WHERE id = $1', [id]);
        if (soRes.rows.length === 0) throw new Error('Order not found');
        const so = soRes.rows[0];

        if (so.status === 'Invoiced') throw new Error('Order already invoiced');

        const linesRes = await client.query('SELECT * FROM sales_order_lines WHERE sales_order_id = $1', [id]);
        let lines = linesRes.rows;

        // STEP A: STOCK CHECK (Dry Run)
        const shippedMap = {}; // { pid: qty_we_can_fulfill }
        for (const line of lines) {
            const stockRes = await client.query("SELECT SUM(quantity_remaining) FROM inventory_batches WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true AND status = 'Good'", [line.product_id]);
            const available = Number(stockRes.rows[0].sum || 0);
            shippedMap[line.product_id] = Math.min(Number(line.ordered_qty), available);
        }

        // STEP B: SCHEME ENGINE
        const schemeInput = Object.entries(shippedMap).map(([pid, qty]) => ({ product_id: Number(pid), qty })).filter(i => i.qty > 0);
        const { freeItems, priceSlabs } = await calculateFreeItems(schemeInput, so.customer_id, client);

        const freeMap = {};
        freeItems.forEach(f => {
            if (!freeMap[f.product_id]) freeMap[f.product_id] = { qty: 0, reasons: [] };
            freeMap[f.product_id].qty += f.qty;
            freeMap[f.product_id].reasons.push(f.reason);
        });

        // Update Tier Applied for reporting
        for (const line of lines) {
            const reasons = [];
            if (freeMap[line.product_id]) reasons.push(...freeMap[line.product_id].reasons);
            if (priceSlabs[line.product_id]) reasons.push(priceSlabs[line.product_id].reason);
            if (reasons.length > 0) {
                await client.query('UPDATE sales_order_lines SET tier_applied = $1 WHERE id = $2', [reasons.join(', '), line.id]);
            }
        }

        // STEP C: INVOICE GENERATION
        const yy = new Date().getFullYear().toString().slice(-2);
        const seqRes = await client.query("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number LIKE $1", [`INV-${yy}-%`]);
        const nextSeq = parseInt(seqRes.rows[0].count) + 1;
        const invNumber = `INV-${yy}-${String(nextSeq).padStart(4, '0')}`;

        const invHeadRes = await client.query(`
            INSERT INTO sales_invoices (invoice_number, sales_order_id, customer_id, invoice_date, status, grand_total)
            VALUES ($1, $2, $3, $4, 'Unpaid', 0) RETURNING id
        `, [invNumber, id, so.customer_id, invoice_date || new Date()]);
        const invId = invHeadRes.rows[0].id;

        // Pricing Context
        const custTierRes = await client.query(`SELECT ch.price_column FROM channels ch JOIN customers c ON c.channel_id = ch.id WHERE c.id = $1`, [so.customer_id]);
        const defaultRateColumn = custTierRes.rows[0]?.price_column || 'dealer_rate';

        const overridesRes = await client.query(`SELECT brand_id, ch.price_column FROM customer_brand_pricing b JOIN channels ch ON b.channel_id = ch.id WHERE b.customer_id = $1`, [so.customer_id]);
        const overrideMap = {};
        overridesRes.rows.forEach(r => overrideMap[r.brand_id] = r.price_column);

        let invTotal = 0;
        let invTax = 0;
        let totalCOGS = 0;

        // Process Products
        const allPids = new Set([...lines.map(l => l.product_id), ...Object.keys(freeMap).map(Number)]);

        for (const pid of allPids) {
            const line = lines.find(l => l.product_id === pid);
            const freeData = freeMap[pid];
            const freeQty = freeData ? freeData.qty : 0;
            const plannedShip = shippedMap[pid] || 0;
            const totalToShip = plannedShip + freeQty;

            if (totalToShip <= 0) continue;

            // Get Rate Column (Fix: join taxes for bracket)
            const prodRes = await client.query(`
                SELECT p.brand_id, t.tax_percentage as tax_bracket 
                FROM products p 
                LEFT JOIN taxes t ON p.tax_id = t.id 
                WHERE p.id = $1
            `, [pid]);
            const brandId = prodRes.rows[0].brand_id;
            const taxPct = Number(prodRes.rows[0].tax_bracket || 0);
            const rateColumn = overrideMap[brandId] || defaultRateColumn;

            // FIFO ALLOCATION
            const batchGroups = {}; // [NEW] Group by Batch ID + MRP to ensure traceability
            const lineTaxRaw = line ? Number(line.tax_percent) : 0;
            const lineTaxPercent = lineTaxRaw > 0 ? lineTaxRaw : taxPct;

            const batches = await client.query(`
                SELECT * FROM inventory_batches WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true AND status = 'Good' ORDER BY created_at ASC FOR UPDATE
            `, [pid]);

            let fulfilledTotal = 0;
            let qtyToFulfill = totalToShip;

            for (const batch of batches.rows) {
                if (qtyToFulfill <= 0) break;
                const take = Math.min(qtyToFulfill, batch.quantity_remaining);
                const unitRate = Number(batch[rateColumn]) || 0;
                const batchMrp = Number(batch.mrp || 0);
                const batchId = batch.id;

                // [NEW] Key includes Batch ID to prevent merging different batches with same MRP
                const groupKey = `${batchMrp}_${batchId}`;

                if (!batchGroups[groupKey]) {
                    batchGroups[groupKey] = { 
                        batch_id: batchId, 
                        mrp: batchMrp, 
                        qty: 0, 
                        gross: 0, 
                        cogs: 0, 
                        slabDeduction: 0 
                    };
                    console.log(`[DEBUG] Created batch group: ${groupKey}, batch_id: ${batchId}`);
                }

                // Price Slab Deduction Calculation
                if (priceSlabs[pid]) {
                    const targetNet = Number(priceSlabs[pid].special_price);
                    const targetExcl = targetNet / (1 + (taxPct / 100));
                    const unitDeduction = Math.max(0, unitRate - targetExcl);
                    batchGroups[groupKey].slabDeduction += (take * unitDeduction);
                }

                await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batchId]);
                await client.query('INSERT INTO stock_traceability (batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type) VALUES ($1, $2, $3, $4, $5, $6)', [batchId, pid, -take, 'OUT', invId, 'Sales Invoice']);

                batchGroups[groupKey].qty += take;
                batchGroups[groupKey].gross += (take * unitRate);
                batchGroups[groupKey].cogs += (take * Number(batch.purchase_rate || 0));

                fulfilledTotal += take;
                qtyToFulfill -= take;
            }

            // Insert Invoice Lines per Batch Group
            let remainingFree = freeQty;
            for (const [key, group] of Object.entries(batchGroups)) {
                if (group.qty <= 0) continue;

                const groupAvgRate = group.gross / group.qty;
                const groupFree = Math.min(remainingFree, group.qty);
                remainingFree -= groupFree;

                const freeItemValue = groupFree * groupAvgRate;
                const lineScheme = freeItemValue + group.slabDeduction;

                const taxableValue = group.gross - lineScheme;
                const taxValue = taxableValue * (taxPct / 100);
                const netValue = taxableValue + taxValue;

                const reasons = [];
                if (freeMap[pid]) reasons.push(...freeMap[pid].reasons);
                if (priceSlabs[pid]) reasons.push(priceSlabs[pid].reason);
                const lineTier = reasons.length > 0 ? reasons.join(', ') : null;

                console.log(`[DEBUG] Inserting Invoice Line: PID=${pid}, BatchID=${group.batch_id}, Qty=${group.qty}`);
                await client.query(`
                    INSERT INTO sales_invoice_lines (
                        invoice_id, product_id, batch_id, shipped_qty, rate, mrp,
                        gross_amount, scheme_amount, taxable_amount, tax_percent, tax_amount, amount, tier_applied
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `, [
                    invId, pid, group.batch_id, group.qty, groupAvgRate.toFixed(2), group.mrp,
                    group.gross, lineScheme, taxableValue, taxPct, taxValue, netValue, lineTier
                ]);

                invTotal += netValue;
                invTax += taxValue;
                totalCOGS += group.cogs;

                // Update SO line progress
                if (line) {
                    await client.query('UPDATE sales_order_lines SET dispatched_qty = dispatched_qty + $1 WHERE id = $2', [group.qty, line.id]);
                }
            }
        }

        // Finalize Header
        if (invTotal === 0) throw new Error("Zero stock available");

        const roundedTotal = Math.round(invTotal); // [FIX] Round to nearest integer (Round to Zero decimal places)
        const roundOff = Number((roundedTotal - invTotal).toFixed(2)); // Diff (+/-)

        const roundedTax = Number(invTax.toFixed(2));
        const taxable = Number((invTotal - roundedTax).toFixed(2)); // Use actual total for taxable back-calculation or just keep as is?
        // Better: Taxable = Actual Total - Tax. The Round Off is a separate P&L line.

        const cgst = Number((roundedTax / 2).toFixed(2));
        const sgst = Number((roundedTax - cgst).toFixed(2));

        await client.query(`
            UPDATE sales_invoices 
            SET grand_total = $1, total_taxable = $2, total_cgst = $3, total_sgst = $4, round_off = $5 
            WHERE id = $6
        `, [roundedTotal, taxable, cgst, sgst, roundOff, invId]);

        // Accounting
        const acc_revenue = 4001, acc_ar = 1101, acc_gst_cgst = 2011, acc_gst_sgst = 2012, acc_cogs = 5001, acc_inventory = 1001, acc_round = 5003;
        const invoiceLines = [
            { code: acc_ar, debit: roundedTotal, credit: 0 },
            { code: acc_revenue, debit: 0, credit: taxable }
        ];
        if (roundedTax > 0) {
            invoiceLines.push({ code: acc_gst_cgst, debit: 0, credit: cgst }, { code: acc_gst_sgst, debit: 0, credit: sgst });
        }

        // [FIX] Add Rounding Line
        if (roundOff !== 0) {
            if (roundOff > 0) {
                // Gain (Credit) e.g. 500.5 -> 501 (+0.5). AR Dr 501. Revenue Cr 500.5. Needs Cr 0.5
                invoiceLines.push({ code: acc_round, debit: 0, credit: Math.abs(roundOff) });
            } else {
                // Loss (Debit) e.g. 500.4 -> 500 (-0.4). AR Dr 500. Revenue Cr 500.4. Needs Dr 0.4
                invoiceLines.push({ code: acc_round, debit: Math.abs(roundOff), credit: 0 });
            }
        }
        await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)', [new Date(), `Invoice: ${invNumber}`, 'SALES_INV', invId, JSON.stringify(invoiceLines)]);

        if (totalCOGS > 0) {
            const cogsLines = [{ code: acc_cogs, debit: totalCOGS.toFixed(2), credit: 0 }, { code: acc_inventory, debit: 0, credit: totalCOGS.toFixed(2) }];
            await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)', [new Date(), `COGS: ${invNumber}`, 'COGS', invId, JSON.stringify(cogsLines)]);
        }

        await client.query("UPDATE sales_orders SET status = 'Invoiced' WHERE id = $1", [id]);
        await client.query('COMMIT');
        res.json({ success: true, invoice_number: invNumber, message: 'Dispatched & Invoiced' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- SALES RETURNS (Credit/Debit Notes) ---


// POST /api/sales/returns/manual - Create a Manual Credit Note (LIFO Allocation)
router.post('/returns/manual', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            customer_id, invoice_id, type, remarks, items,
            return_date, created_by
        } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ error: 'No items or amount in return' });

        await client.query('BEGIN');

        // 1. Generate Return Number from Sequence Table (Unified with Delivery Settlement)
        const seqUpdate = await client.query(`
            UPDATE document_sequences 
            SET current_number = current_number + 1 
            WHERE document_type = 'SR' 
            RETURNING prefix, current_number
        `);
        if (seqUpdate.rows.length === 0) throw new Error("Document sequence for 'SR' missing.");
        const returnNumber = `${seqUpdate.rows[0].prefix}${String(seqUpdate.rows[0].current_number).padStart(4, '0')}`;

        // 2. Initial Totals Calculation
        let totalTaxable = 0;
        let totalTax = 0;
        let grandTotal = 0;

        // 3. Insert Header
        const headRes = await client.query(`
            INSERT INTO sales_returns (
                return_number, customer_id, invoice_id, return_date,
                type, remarks, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, 'Applied', $7)
            RETURNING id
        `, [
            returnNumber, customer_id, invoice_id, return_date || new Date(),
            type || 'Sales Return', remarks, created_by
        ]);
        const returnId = headRes.rows[0].id;

        // 4. Process Lines
        for (const item of items) {
            const qty = Number(item.Qty || 1);
            const rate = Number(item.Price || 0);
            const taxPct = Number(item['GST %'] || 0);
            const productId = item._product_id?.startsWith('FLAT_') ? null : item._product_id;
            const batchId = item.batch_id || null;
            const inventoryStatus = item.inventory_status || 'Good'; // [NEW] Status from UI

            // A. Valuation Logic (Matching Delivery Sync)
            let unitNet = Number(item['Taxable $'] || 0) / qty; 
            
            // If linked to an invoice, try to fetch the precise historic net rate
            if (invoice_id && productId) {
                const histRes = await client.query(`
                    SELECT (taxable_amount / NULLIF(shipped_qty, 0)) as unit_net 
                    FROM sales_invoice_lines 
                    WHERE invoice_id = $1 AND product_id = $2 LIMIT 1
                `, [invoice_id, productId]);
                if (histRes.rows.length > 0) unitNet = Number(histRes.rows[0].unit_net);
            }

            const grossAmount = qty * rate;
            const taxableAmount = Number((qty * unitNet).toFixed(2));
            const schemeAmount = Number((grossAmount - taxableAmount).toFixed(2));
            const taxAmount = Number((taxableAmount * (taxPct / 100)).toFixed(2));
            const lineTotal = Number((taxableAmount + taxAmount).toFixed(2));

            // B. Insert Line - Placeholder batchId, will update if routed
            const lineRes = await client.query(`
                INSERT INTO sales_return_lines (
                    return_id, product_id, batch_id, qty, rate,
                    gross_amount, scheme_amount, taxable_amount, 
                    tax_percent, tax_amount, amount, reason, 
                    return_to_stock, inventory_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING id
            `, [
                returnId, productId, batchId, qty, rate,
                grossAmount, schemeAmount, taxableAmount,
                taxPct, taxAmount, lineTotal, item.reason || remarks,
                item.return_to_stock === true, inventoryStatus
            ]);
            const lineId = lineRes.rows[0].id;

            // C. Stock Routing (Matching Delivery Sync "Gold Standard")
            if (item.return_to_stock === true && batchId) {
                const origBatchRes = await client.query("SELECT * FROM inventory_batches WHERE id = $1", [batchId]);
                const orig = origBatchRes.rows[0];
                let finalBatchId = batchId;

                if (orig && orig.status !== inventoryStatus) {
                    // Find or Create a twin batch with the new status (Damage/Expiry/Good)
                    const existingRes = await client.query(
                        "SELECT id FROM inventory_batches WHERE product_id = $1 AND batch_code = $2 AND status = $3",
                        [orig.product_id, orig.batch_code, inventoryStatus]
                    );
                    
                    if (existingRes.rows.length > 0) {
                        finalBatchId = existingRes.rows[0].id;
                    } else {
                        const cloneRes = await client.query(`
                            INSERT INTO inventory_batches (
                                product_id, grn_id, batch_code, mrp, purchase_rate, 
                                distributor_rate, wholesale_rate, dealer_rate, retail_rate, 
                                quantity_initial, quantity_remaining, expiry_date, is_active, status
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, $10, true, $11)
                            RETURNING id
                        `, [
                            orig.product_id, orig.grn_id, orig.batch_code, orig.mrp, 
                            orig.purchase_rate, orig.distributor_rate, orig.wholesale_rate, 
                            orig.dealer_rate, orig.retail_rate, orig.expiry_date, inventoryStatus
                        ]);
                        finalBatchId = cloneRes.rows[0].id;
                    }
                    
                    // Update line record with the actual batch that received the stock
                    await client.query("UPDATE sales_return_lines SET batch_id = $1 WHERE id = $2", [finalBatchId, lineId]);
                }

                await client.query(`UPDATE inventory_batches SET quantity_remaining = quantity_remaining + $1 WHERE id = $2`, [qty, finalBatchId]);
                await client.query(`
                    INSERT INTO stock_traceability (
                        batch_id, product_id, quantity_change, transaction_type, 
                        reference_id, reference_type, notes
                    ) VALUES ($1, $2, $3, 'IN', $4, 'Sales Return', $5)
                `, [finalBatchId, productId, qty, returnId, `Manual Return - Routed to ${inventoryStatus} bucket`]);
            }

            totalTaxable += taxableAmount;
            totalTax += taxAmount;
            grandTotal += lineTotal;
        }

        // Update Header with finalized totals
        await client.query(`
            UPDATE sales_returns 
            SET total_taxable = $1, total_tax = $2, grand_total = $3 
            WHERE id = $4
        `, [totalTaxable, totalTax, grandTotal, returnId]);

        // 5. ALLOCATION LOGIC (LIFO)
        let remainingToAllocate = grandTotal;

        // A. Priority: Linked Invoice
        if (invoice_id && remainingToAllocate > 0) {
            const invRes = await client.query(`
                SELECT id, grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id), 0) as balance
                FROM sales_invoices WHERE id = $1
            `, [invoice_id]);
            
            if (invRes.rows.length > 0) {
                const balance = Number(invRes.rows[0].balance);
                const alloc = Math.min(balance, remainingToAllocate);
                if (alloc > 0) {
                    await client.query(`
                        INSERT INTO customer_payment_allocations (invoice_id, amount, allocated_at, return_id)
                        VALUES ($1, $2, NOW(), $3)
                    `, [invoice_id, alloc, returnId]);
                    remainingToAllocate -= alloc;
                }
            }
        }

        // B. Spillover: LIFO (Newest First)
        if (remainingToAllocate > 0.01) {
            const pendingRes = await client.query(`
                SELECT id, (grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id), 0)) as balance
                FROM sales_invoices
                WHERE customer_id = $1 AND status != 'Cancelled'
                AND (grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id), 0)) > 0
                AND id != $2
                ORDER BY invoice_date DESC, created_at DESC
            `, [customer_id, invoice_id || -1]);

            for (const inv of pendingRes.rows) {
                if (remainingToAllocate <= 0.01) break;
                const alloc = Math.min(Number(inv.balance), remainingToAllocate);
                await client.query(`
                    INSERT INTO customer_payment_allocations (invoice_id, amount, allocated_at, return_id)
                    VALUES ($1, $2, NOW(), $3)
                `, [inv.id, alloc, returnId]);
                remainingToAllocate -= alloc;
            }
        }

        // 6. ACCOUNTING (LEDGER)
        const acc_ar = 1101, acc_returns = 4003, acc_cgst = 2011, acc_sgst = 2012;
        const ledgerLines = [
            { code: acc_ar, debit: 0, credit: grandTotal },
            { code: acc_returns, debit: totalTaxable, credit: 0 }
        ];

        if (totalTax > 0) {
            const halfTax = Number((totalTax / 2).toFixed(2));
            const otherHalf = Number((totalTax - halfTax).toFixed(2));
            ledgerLines.push({ code: acc_cgst, debit: halfTax, credit: 0 });
            ledgerLines.push({ code: acc_sgst, debit: otherHalf, credit: 0 });
        }

        await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)', [
            new Date(), `Manual Credit Note: ${returnNumber}`, 'SALES_RET', returnId, JSON.stringify(ledgerLines)
        ]);

        await client.query('COMMIT');
        res.status(201).json({ success: true, return_number: returnNumber, id: returnId, message: 'Credit Note Applied' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Manual Return Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// POST /api/sales/returns - Create a Return (Draft)
router.post('/returns', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            customer_id, invoice_id, type, remarks, items,
            return_date, created_by
        } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ error: 'No items in return' });

        await client.query('BEGIN');

        // 1. Generate Return Number (SRN-YY-SEQ)
        // 1. Generate Return Number (SR-XXXX)
        const seqRes = await client.query("SELECT return_number FROM sales_returns WHERE return_number LIKE 'SR-%' ORDER BY return_number DESC LIMIT 1");
        let nextSeq = 1;
        if (seqRes.rows.length > 0) {
            const parts = seqRes.rows[0].return_number.split('-');
            const lastNum = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastNum)) nextSeq = lastNum + 1;
        }
        const returnNumber = `SR-${String(nextSeq).padStart(4, '0')}`;

        // 2. Insert Header (Calculate totals later)
        const headRes = await client.query(`
            INSERT INTO sales_returns(
                    return_number, customer_id, invoice_id, return_date,
                    type, remarks, status, created_by
                ) VALUES($1, $2, $3, $4, $5, $6, 'Draft', $7)
            RETURNING id
                    `, [
            returnNumber, customer_id, invoice_id, return_date || new Date(),
            type, remarks, created_by
        ]);
        const returnId = headRes.rows[0].id;

        let totalTaxable = 0;
        let totalTax = 0;

        // 3. Insert Lines
        for (const item of items) {
            const qty = Number(item.qty);
            const rate = Number(item.rate);
            const taxPct = Number(item.tax_pct || 0);

            const taxable = qty * rate;
            const taxAmt = taxable * (taxPct / 100);
            const lineTotal = taxable + taxAmt;

            await client.query(`
                INSERT INTO sales_return_lines(
                        return_id, product_id, batch_id, qty, rate,
                        tax_percent, tax_amount, amount, reason, return_to_stock
                    ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [
                returnId, item.product_id, item.batch_id, qty, rate,
                taxPct, taxAmt, lineTotal, item.reason, item.return_to_stock !== false
            ]);

            totalTaxable += taxable;
            totalTax += taxAmt;
        }

        // 4. Update Header Totals
        await client.query(`
            UPDATE sales_returns 
            SET total_taxable = $1, total_tax = $2, grand_total = $3 
            WHERE id = $4
                    `, [totalTaxable, totalTax, totalTaxable + totalTax, returnId]);

        await client.query('COMMIT');
        res.status(201).json({ success: true, return_number: returnNumber, id: returnId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// POST /api/sales/returns/:id/apply - Finalize Return (Stock In + Balance Adjustment)
router.post('/returns/:id/apply', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { applied_by } = req.body;

        await client.query('BEGIN');

        // 1. Fetch Return & Lines
        const returnRes = await client.query('SELECT * FROM sales_returns WHERE id = $1', [id]);
        if (returnRes.rows.length === 0) throw new Error('Return not found');
        const ret = returnRes.rows[0];
        if (ret.status === 'Applied') throw new Error('Return already applied');

        const linesRes = await client.query('SELECT * FROM sales_return_lines WHERE return_id = $1', [id]);

        // 2. Process Lines: Impact Stock
        for (const line of linesRes.rows) {
            if (line.return_to_stock) {
                // If batch_id specified, use it. Else pick latest batch for that product.
                let targetBatchId = line.batch_id;

                if (!targetBatchId) {
                    const latestBatch = await client.query(
                        'SELECT id FROM inventory_batches WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1',
                        [line.product_id]
                    );
                    if (latestBatch.rows.length > 0) {
                        targetBatchId = latestBatch.rows[0].id;
                    }
                }

                if (targetBatchId) {
                    // Increase Stock
                    await client.query(`
                        UPDATE inventory_batches 
                        SET quantity_remaining = quantity_remaining + $1 
                        WHERE id = $2
                    `, [line.qty, targetBatchId]);

                    // Audit Trail
                    await client.query(`
                        INSERT INTO stock_traceability(
                        batch_id, product_id, quantity_change, transaction_type,
                        reference_id, reference_type, notes
                    ) VALUES($1, $2, $3, 'IN', $4, 'Sales Return', $5)
                    `, [
                        targetBatchId, line.product_id, line.qty, id, `Return #${ret.return_number}`
                    ]);
                }
            }
        }

        // 3. Mark as Applied
        await client.query(`
            UPDATE sales_returns 
            SET status = 'Applied', applied_by = $1, applied_at = NOW() 
            WHERE id = $2
                    `, [applied_by, id]);

        // --- ACCOUNTING INTEGRATION ---
        const acc_ar = 1101;
        const acc_revenue = 4001;
        const acc_gst_cgst = 2011;
        const acc_gst_sgst = 2012;
        const acc_cogs = 5001;
        const acc_inventory = 1001;

        const taxable = Number(ret.total_taxable || 0);
        const tax = Number(ret.total_tax || 0);
        const total = Number(ret.grand_total || 0);

        // 1. Revenue Reversal (Dr Revenue/Tax, Cr AR)
        let reverseLines = [
            { code: acc_revenue, debit: taxable, credit: 0 },
            { code: acc_ar, debit: 0, credit: total }
        ];
        if (tax > 0) {
            reverseLines.push({ code: acc_gst_cgst, debit: Number((tax / 2).toFixed(2)), credit: 0 });
            reverseLines.push({ code: acc_gst_sgst, debit: Number((tax - (tax / 2)).toFixed(2)), credit: 0 });
        }
        await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
            [new Date(), `Sales Return: ${ret.return_number}`, 'SALES_RET', id, JSON.stringify(reverseLines)]);

        // 2. COGS Reversal (Dr Inventory, Cr COGS) if returned to stock
        let totalCOGS_Reversal = 0;
        for (const line of linesRes.rows) {
            if (line.return_to_stock) {
                const pRateRes = await client.query('SELECT purchase_rate FROM products WHERE id = $1', [line.product_id]);
                totalCOGS_Reversal += (Number(pRateRes.rows[0]?.purchase_rate) || 0) * Number(line.qty);
            }
        }

        if (totalCOGS_Reversal > 0) {
            const stockInLines = [
                { code: acc_inventory, debit: Number(totalCOGS_Reversal.toFixed(2)), credit: 0 },
                { code: acc_cogs, debit: 0, credit: Number(totalCOGS_Reversal.toFixed(2)) }
            ];
            await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
                [new Date(), `Stock Reversal for Return: ${ret.return_number}`, 'COGS_REV', id, JSON.stringify(stockInLines)]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Return Applied. Stock and Ledger updated.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// POST /api/sales/orders/bulk-dispatch - Process multiple orders
router.post('/orders/bulk-dispatch', async (req, res) => {
    let { order_ids, invoice_date } = req.body;
    if (!order_ids) return res.status(400).json({ error: 'Missing order_ids' });
    if (typeof order_ids === 'string') order_ids = order_ids.split(',').map(s => s.trim());
    if (!Array.isArray(order_ids)) return res.status(400).json({ error: 'Invalid order_ids format' });

    const results = [];
    const client = await pool.connect();

    try {
        for (let orderItem of order_ids) {
            let id = (typeof orderItem === 'object' && orderItem !== null && orderItem.id) ? orderItem.id : orderItem;
            try {
                await client.query('BEGIN');

                // 1. Fetch Order
                const soRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [id]);
                if (soRes.rows.length === 0) throw new Error(`Order ${id} not found`);
                const so = soRes.rows[0];
                if (so.status === 'Invoiced') throw new Error(`Order ${so.so_number} already invoiced`);

                const linesRes = await client.query('SELECT * FROM sales_order_lines WHERE sales_order_id = $1', [id]);
                let lines = linesRes.rows;

                // [FIX] 1.5 SCHEME LOGIC (Bulk) - Corrected Signature and Return Handling
                const orderedItems = lines.map(l => ({ product_id: l.product_id, qty: l.ordered_qty }));
                const { freeItems, priceSlabs } = await calculateFreeItems(orderedItems, so.customer_id, client);

                const freeMap = {};
                for (const free of freeItems) {
                    if (!freeMap[free.product_id]) freeMap[free.product_id] = { qty: 0, reasons: [] };
                    freeMap[free.product_id].qty += free.qty;
                    freeMap[free.product_id].reasons.push(free.reason);
                }

                // Update Tier Applied in SO lines for transparency
                for (const line of lines) {
                    const reasons = [];
                    if (freeMap[line.product_id]) reasons.push(...freeMap[line.product_id].reasons);
                    if (priceSlabs[line.product_id]) reasons.push(priceSlabs[line.product_id].reason);
                    if (reasons.length > 0) {
                        await client.query('UPDATE sales_order_lines SET tier_applied = $1 WHERE id = $2', [reasons.join(', '), line.id]);
                    }
                }
                // ----------------------------------------

                // 2. Generate Invoice Number
                const yy = new Date().getFullYear().toString().slice(-2);
                const seqRes = await client.query("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number LIKE $1 OR invoice_number LIKE $2", [`INV-${yy}-%`, `INV - ${yy} -%`]);
                let nextSeq = parseInt(seqRes.rows[0].count) + 1;
                let invNumber;
                let check;
                do {
                    invNumber = `INV-${yy}-${String(nextSeq).padStart(4, '0')}`;
                    check = await client.query("SELECT id FROM sales_invoices WHERE invoice_number = $1", [invNumber]);
                    if (check.rows.length > 0) nextSeq++;
                } while (check.rows.length > 0);

                // 3. Create Invoice Header
                const invHeadRes = await client.query(`
                    INSERT INTO sales_invoices(
                        invoice_number, sales_order_id, customer_id, invoice_date,
                        status, grand_total
                    ) VALUES($1, $2, $3, $4, 'Unpaid', 0)
                    RETURNING id
                    `, [invNumber, id, so.customer_id, invoice_date || new Date()]);
                const invId = invHeadRes.rows[0].id;

                // [NEW] 1.5 Fetch Pricing Tiers & Brand Overrides
                const custTierRes = await client.query(`
                    SELECT c.price_column 
                    FROM channels c 
                    JOIN customers cust ON cust.channel_id = c.id 
                    WHERE cust.id = $1
                `, [so.customer_id]);
                const defaultRateColumn = custTierRes.rows[0]?.price_column || 'dealer_rate';

                const overridesRes = await client.query(`
                    SELECT b.brand_id, ch.price_column 
                    FROM customer_brand_pricing b
                    JOIN channels ch ON b.channel_id = ch.id
                    WHERE b.customer_id = $1
                `, [so.customer_id]);
                const overrideMap = {};
                overridesRes.rows.forEach(r => overrideMap[r.brand_id] = r.price_column);

                let invTotal = 0;
                let invTax = 0;
                let totalCOGS = 0;

                // 4. Combined FIFO Stock Allocation (Paid + Free)
                // Use strings for allPids to avoid numeric mapping duplicates (bigint vs number)
                console.log(`[Bulk Dispatch] Processing Order ${id}...`);
                const allPids = new Set([
                    ...lines.map(l => String(l.product_id)),
                    ...Object.keys(freeMap)
                ]);

                // Pre-fetch product metadata for all involved PIDs to reduce query overhead
                const pidsArray = Array.from(allPids).map(Number).filter(n => !isNaN(n) && n !== null && n !== 0);
                const productsRes = await client.query(`
                    SELECT p.id, p.brand_id, p.tax_id, t.tax_percentage as tax_bracket 
                    FROM products p 
                    LEFT JOIN taxes t ON p.tax_id = t.id 
                    WHERE p.id = ANY($1)
                `, [pidsArray]);
                const prodMeta = {};
                productsRes.rows.forEach(p => prodMeta[String(p.id)] = p);

                for (const pid of allPids) {
                    const line = lines.find(l => String(l.product_id) === pid);
                    const freeData = freeMap[pid];
                    const freeQty = freeData ? freeData.qty : 0;
                    const paidQty = line ? Number(line.ordered_qty) : 0;
                    const totalToShip = paidQty + freeQty;

                    if (totalToShip <= 0) continue;

                    const pInfo = prodMeta[pid];
                    if (!pInfo) {
                        console.error(`[Bulk Dispatch] Missing metadata for PID ${pid}`);
                        continue;
                    }

                    const brandId = pInfo.brand_id;
                    const taxPct = Number(pInfo.tax_bracket || 0);
                    const rateColumn = overrideMap[brandId] || defaultRateColumn;
                    const lineTaxRaw = line ? Number(line.tax_percent) : 0;
                    const lineTaxPercent = lineTaxRaw > 0 ? lineTaxRaw : taxPct;

                    const batchesRes = await client.query(`
                        SELECT id, quantity_remaining, purchase_rate, mrp, distributor_rate, wholesale_rate, dealer_rate, retail_rate
                        FROM inventory_batches 
                        WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true AND status = 'Good'
                        ORDER BY created_at ASC FOR UPDATE
                    `, [pid]);

                    const batchGroups = {};

                    let qtyToFulfill = totalToShip;
                    for (const batch of batchesRes.rows) {
                        if (qtyToFulfill <= 0) break;
                        const take = Math.min(qtyToFulfill, batch.quantity_remaining);
                        // For bulk dispatch, we use the rate ALREADY on the line (unless it's a pure free rule item not in SO)
                        const batchRate = line ? Number(line.rate) : (Number(batch[rateColumn]) || 0);
                        const batchMrp = Number(batch.mrp || 0);
                        const batchId = batch.id;

                        const groupKey = `${batchMrp}_${batchId}`;
                        if (!batchGroups[groupKey]) {
                            batchGroups[groupKey] = { batch_id: batchId, qty: 0, cogs: 0, slabDeduction: 0, rate: batchRate, mrp: batchMrp };
                        }

                        // Price Slab Deduction Calculation
                        if (priceSlabs[pid]) {
                            const targetNet = Number(priceSlabs[pid].special_price);
                            const targetExcl = targetNet / (1 + (lineTaxPercent / 100));
                            const unitDeduction = Math.max(0, batchRate - targetExcl);
                            batchGroups[groupKey].slabDeduction += (take * unitDeduction);
                        }

                        await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batchId]);
                        await client.query(`
                            INSERT INTO stock_traceability(batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes)
                            VALUES($1, $2, $3, 'OUT', $4, 'Sales Invoice', $5)
                        `, [batchId, pid, -take, invId, `Bulk Dispatch for ${invNumber}`]);

                        batchGroups[groupKey].qty += take;
                        batchGroups[groupKey].cogs += (Number(batch.purchase_rate) || 0) * take;
                        qtyToFulfill -= take;
                    }

                    // Insert Invoice Lines per Batch Group
                    let remainingFree = freeQty;
                    for (const [key, group] of Object.entries(batchGroups)) {
                        if (group.qty <= 0) continue;

                        // Calculate pro-rated free units for this cluster
                        const groupFree = Math.min(remainingFree, group.qty);
                        remainingFree -= groupFree;

                        const freeItemValue = groupFree * group.rate;
                        const lineScheme = freeItemValue + group.slabDeduction;

                        const lineGross = group.qty * group.rate;
                        const taxableValue = lineGross - lineScheme;
                        const taxValue = taxableValue * (lineTaxPercent / 100);
                        const netValue = taxableValue + taxValue;

                        const reasons = [];
                        if (freeMap[pid]) reasons.push(...freeMap[pid].reasons);
                        if (priceSlabs[pid]) reasons.push(priceSlabs[pid].reason);
                        const lineTier = reasons.length > 0 ? reasons.join(', ') : null;

                        await client.query(`
                            INSERT INTO sales_invoice_lines (
                                invoice_id, product_id, batch_id, shipped_qty, rate, mrp, 
                                gross_amount, scheme_amount, taxable_amount, 
                                tax_percent, tax_amount, amount, tier_applied
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                        `, [
                            invId, pid, group.batch_id, group.qty, group.rate, group.mrp,
                            lineGross, lineScheme, taxableValue,
                            lineTaxPercent, taxValue, netValue, lineTier
                        ]);

                        invTotal += netValue;
                        invTax += taxValue;
                        totalCOGS += group.cogs;
                    }

                    // Update SO Line Dispatch Progress & Shortage
                    if (line) {
                        const shippedForThisLine = paidQty - Math.max(0, qtyToFulfill - freeQty);
                        const finalDispatched = Number(line.dispatched_qty || 0) + shippedForThisLine;
                        const shortage = paidQty - finalDispatched;
                        await client.query(`
                            UPDATE sales_order_lines SET dispatched_qty = $1, cancelled_qty = $2 WHERE id = $3
                        `, [finalDispatched, shortage, line.id]);
                    }
                }

                // 5. Finalize
                if (invTotal === 0) {
                    throw new Error("Zero stock available for this order.");
                }

                const roundedTotal = Math.round(invTotal);
                const roundOff = Number((roundedTotal - invTotal).toFixed(2));
                const roundedTax = Number(invTax.toFixed(2));
                const taxable = Number((invTotal - roundedTax).toFixed(2));
                const cgst = Number((roundedTax / 2).toFixed(2));
                const sgst = Number((roundedTax - cgst).toFixed(2));

                await client.query(`
                    UPDATE sales_invoices 
                    SET grand_total = $1, total_taxable = $2, total_cgst = $3, total_sgst = $4, round_off = $5 
                    WHERE id = $6
                `, [roundedTotal, taxable, cgst, sgst, roundOff, invId]);

                // --- ACCOUNTING INTEGRATION ---
                const acc_revenue = 4001;
                const acc_ar = 1101;
                const acc_gst_cgst = 2011;
                const acc_gst_sgst = 2012;
                const acc_cogs = 5001;
                const acc_inventory = 1001;

                let invoiceLines = [
                    { code: acc_ar, debit: roundedTotal, credit: 0 },
                    { code: acc_revenue, debit: 0, credit: taxable }
                ];
                if (roundedTax > 0) {
                    invoiceLines.push({ code: acc_gst_cgst, debit: 0, credit: cgst });
                    invoiceLines.push({ code: acc_gst_sgst, debit: 0, credit: sgst });
                }
                await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
                    [new Date(), `Sales Invoice: ${invNumber}`, 'SALES_INV', invId, JSON.stringify(invoiceLines)]);

                // 2. COGS Entry (COGS vs Inventory)
                if (totalCOGS > 0) {
                    const roundedCOGS = Number(totalCOGS.toFixed(2));
                    const cogsLines = [
                        { code: acc_cogs, debit: roundedCOGS, credit: 0 },
                        { code: acc_inventory, debit: 0, credit: roundedCOGS }
                    ];
                    await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
                        [new Date(), `COGS for ${invNumber}`, 'COGS', invId, JSON.stringify(cogsLines)]);
                }

                // 7. Mark Order as Invoiced
                await client.query("UPDATE sales_orders SET status = 'Invoiced' WHERE id = $1", [id]);

                await client.query('COMMIT');
                results.push({ id, order_id: id, status: 'Success', invoice_number: invNumber });

            } catch (err) {
                await client.query('ROLLBACK');
                console.error("Bulk Order Error:", err);
                results.push({ id: (typeof id === 'object' ? id.id : id), order_id: (typeof id === 'object' ? id.id : id), status: 'Failed', error: err.stack || err.message });
            }
        }
        res.json(results);
    } finally {
        client.release();
    }
});

// POST /api/sales/bulk-invoice-generate - Complex logic for Admin Dashboard
router.post('/bulk-invoice-generate', async (req, res) => {
    let { order_ids, transit_stock } = req.body;
    if (!order_ids) return res.status(400).json({ error: 'Missing order_ids' });
    if (typeof order_ids === 'string') order_ids = order_ids.split(',').map(s => s.trim());
    if (!Array.isArray(order_ids)) return res.status(400).json({ error: 'Invalid order_ids format' });

    const results = [];
    const client = await pool.connect();
    const transitMap = transit_stock || {}; // { "pid": { qty, batch_code, rate } }

    try {
        for (let orderItem of order_ids) {
            let orderId = (typeof orderItem === 'object' && orderItem !== null && orderItem.id) ? orderItem.id : orderItem;
            try {
                console.log(`[Bulk Invoice] Processing Order ${orderId}...`);
                await client.query('BEGIN');

                // 1. Fetch Order Header
                const soRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [orderId]);
                if (soRes.rows.length === 0) throw new Error(`Order ${orderId} not found`);
                const so = soRes.rows[0];
                if (so.status === 'Invoiced') throw new Error(`Order ${so.so_number} already invoiced`);

                // Check if already invoiced
                const checkInv = await client.query("SELECT id FROM sales_invoices WHERE sales_order_id = $1", [orderId]);
                if (checkInv.rows.length > 0) {
                    return { id: orderId, status: 'Failed', error: `Order ${so.so_number} already invoiced` };
                }
                // 2. Fetch Order Lines
                const linesRes = await client.query('SELECT * FROM sales_order_lines WHERE sales_order_id = $1', [orderId]);
                let lines = linesRes.rows;

                const pids = lines.map(l => l.product_id);
                const stockRes = await client.query(`
                    SELECT product_id, SUM(quantity_remaining) as total 
                    FROM inventory_batches 
                    WHERE product_id = ANY($1) AND is_active = true 
                    GROUP BY product_id
                `, [pids]);
                const stockMap = {};
                stockRes.rows.forEach(r => stockMap[r.product_id] = parseFloat(r.total));

                // [FIX] 2.5 SCHEME LOGIC (Bulk Admin) - Use Deliverable Qty (Min of Ordered vs Available)
                // This ensures we ONLY apply schemes for items we can actually ship today.
                const orderedItems = lines.map(l => {
                    const availableReal = stockMap[l.product_id] || 0;
                    const availableTransit = transitMap[l.product_id] ? parseFloat(transitMap[l.product_id].qty) : 0;
                    const deliverableQty = Math.min(Number(l.ordered_qty), availableReal + availableTransit);
                    return { product_id: l.product_id, qty: deliverableQty };
                });
                
                const { freeItems, priceSlabs } = await calculateFreeItems(orderedItems, so.customer_id, client);

                const freeMap = {};
                for (const free of freeItems) {
                    if (!freeMap[free.product_id]) freeMap[free.product_id] = { qty: 0, reasons: [] };
                    freeMap[free.product_id].qty += free.qty;
                    freeMap[free.product_id].reasons.push(free.reason);
                }

                // Update Tier Applied for reporting
                for (const line of lines) {
                    const reasons = [];
                    if (freeMap[line.product_id]) reasons.push(...freeMap[line.product_id].reasons);
                    if (priceSlabs[line.product_id]) reasons.push(priceSlabs[line.product_id].reason);
                    if (reasons.length > 0) {
                        await client.query('UPDATE sales_order_lines SET tier_applied = $1 WHERE id = $2', [reasons.join(', '), line.id]);
                    }
                }

                // 3. Create Invoice Header
                const yy = new Date().getFullYear().toString().slice(-2);
                // Flexible search to find old formats
                const seqRes = await client.query("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number LIKE $1 OR invoice_number LIKE $2", [`INV-${yy}-%`, `INV - ${yy} -%`]);
                let nextSeq = parseInt(seqRes.rows[0].count) + 1;
                let invNumber;
                let check;
                do {
                    invNumber = `INV-${yy}-${String(nextSeq).padStart(4, '0')}`;
                    check = await client.query("SELECT id FROM sales_invoices WHERE invoice_number = $1", [invNumber]);
                    if (check.rows.length > 0) nextSeq++;
                } while (check.rows.length > 0);

                const invHeadRes = await client.query(`
                    INSERT INTO sales_invoices(invoice_number, sales_order_id, customer_id, status, grand_total, invoice_date)
                VALUES($1, $2, $3, 'Unpaid', 0, NOW()) RETURNING id
                `, [invNumber, orderId, so.customer_id]);
                const invId = invHeadRes.rows[0].id;
                // [NEW] 1.5 Fetch Pricing Tiers & Brand Overrides
                const custTierRes = await client.query(`
                    SELECT c.price_column 
                    FROM channels c 
                    JOIN customers cust ON cust.channel_id = c.id 
                    WHERE cust.id = $1
                `, [so.customer_id]);
                const defaultRateColumn = custTierRes.rows[0]?.price_column || 'dealer_rate';

                const overridesRes = await client.query(`
                    SELECT b.brand_id, ch.price_column 
                    FROM customer_brand_pricing b
                    JOIN channels ch ON b.channel_id = ch.id
                    WHERE b.customer_id = $1
                `, [so.customer_id]);
                const overrideMap = {};
                overridesRes.rows.forEach(r => overrideMap[r.brand_id] = r.price_column);

                let invTotal = 0;
                let invTax = 0;
                let totalCOGS = 0;
                let fullyFulfilled = true;

                // 4. Combined FIFO Stock Allocation (Real + Transit + Scheme)
                // Use strings for allPids to avoid numeric mapping duplicates (bigint vs number)
                const allPids = new Set([
                    ...lines.map(l => String(l.product_id)),
                    ...Object.keys(freeMap)
                ]);

                // Pre-fetch product metadata for all involved PIDs to reduce query overhead
                const pidsArray = Array.from(allPids).map(Number).filter(n => !isNaN(n) && n !== null && n !== 0);
                const productsRes = await client.query(`
                    SELECT p.id, p.brand_id, p.tax_id, t.tax_percentage as tax_bracket 
                    FROM products p 
                    LEFT JOIN taxes t ON p.tax_id = t.id 
                    WHERE p.id = ANY($1)
                `, [pidsArray]);
                const prodMeta = {};
                productsRes.rows.forEach(p => prodMeta[String(p.id)] = p);

                for (const pid of allPids) {
                    const line = lines.find(l => String(l.product_id) === pid);
                    const freeData = freeMap[pid];
                    const freeQty = freeData ? freeData.qty : 0;
                    const paidQty = line ? Number(line.ordered_qty) : 0;
                    let qtyToFulfill = paidQty + freeQty;

                    if (qtyToFulfill <= 0) continue;

                    const pInfo = prodMeta[pid];
                    if (!pInfo) {
                        console.error(`[Bulk Admin] Missing metadata for PID ${pid}`);
                        continue;
                    }

                    const brandId = pInfo.brand_id;
                    const taxPct = Number(pInfo.tax_bracket || 0);
                    const rateColumn = overrideMap[brandId] || defaultRateColumn;
                    const lineTaxRaw = line ? Number(line.tax_percent) : 0;
                    const lineTaxPercent = lineTaxRaw > 0 ? lineTaxRaw : taxPct;

                    // A. Check REAL Inventory Batches
                    const batchesRes = await client.query(`
                        SELECT id, quantity_remaining, mrp, purchase_rate,
                                distributor_rate, wholesale_rate, dealer_rate, retail_rate
                        FROM inventory_batches 
                        WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true
                        ORDER BY created_at ASC FOR UPDATE
                    `, [pid]);

                    const batchGroups = {};
                    for (const batch of batchesRes.rows) {
                        if (qtyToFulfill <= 0) break;
                        const take = Math.min(qtyToFulfill, batch.quantity_remaining);
                        // For Admin generate, we re-calculate rate based on tier
                        const batchRate = Number(batch[rateColumn]) || 0;
                        const batchMrp = Number(batch.mrp || 0);
                        const batchId = batch.id;

                        const groupKey = `${batchMrp}_${batchId}`;
                        if (!batchGroups[groupKey]) {
                            batchGroups[groupKey] = { batch_id: batchId, qty: 0, gross: 0, cogs: 0, slabDeduction: 0, rate: batchRate, mrp: batchMrp };
                        }

                        // Price Slab Deduction Calculation
                        if (priceSlabs[pid]) {
                            const targetNet = Number(priceSlabs[pid].special_price);
                            const targetExcl = targetNet / (1 + (taxPct / 100));
                            const unitDeduction = Math.max(0, batchRate - targetExcl);
                            batchGroups[groupKey].slabDeduction += (take * unitDeduction);
                        }

                        await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batchId]);
                        await client.query(`
                            INSERT INTO stock_traceability(batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes)
                            VALUES($1, $2, $3, 'OUT', $4, 'Sales Invoice', $5)
                        `, [batchId, pid, -take, invId, `Real stock for ${invNumber}`]);

                        batchGroups[groupKey].qty += take;
                        batchGroups[groupKey].gross += (take * batchRate);
                        batchGroups[groupKey].cogs += (Number(batch.purchase_rate) || 0) * take;
                        qtyToFulfill -= take;
                    }

                    // B. TRANSIT stock handling
                    if (qtyToFulfill > 0 && transitMap[pid]) {
                        const transit = transitMap[pid];
                        const take = Math.min(qtyToFulfill, Number(transit.qty));
                        const pMaster = await client.query(`SELECT mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate FROM products WHERE id = $1`, [pid]);
                        const transitRate = Number(pMaster.rows[0][rateColumn]) || 0;
                        const transitMrp = transit.mrp || pMaster.rows[0].mrp;

                        transitMap[pid].qty -= take;
                        let batchId;
                        const existingBatch = await client.query('SELECT id FROM inventory_batches WHERE product_id = $1 AND batch_code = $2', [pid, transit.batch_code]);
                        if (existingBatch.rows.length > 0) {
                            batchId = existingBatch.rows[0].id;
                        } else {
                            const p = pMaster.rows[0];
                            const newBatch = await client.query(`
                                INSERT INTO inventory_batches (
                                    product_id, batch_code, quantity_remaining, purchase_rate, mrp, 
                                    distributor_rate, wholesale_rate, dealer_rate, retail_rate, is_active
                                ) VALUES ($1, $2, 0, $3, $4, $5, $6, $7, $8, false) RETURNING id
                            `, [pid, transit.batch_code, p.purchase_rate, p.mrp, p.distributor_rate, p.wholesale_rate, p.dealer_rate, p.retail_rate]);
                            batchId = newBatch.rows[0].id;
                        }

                        const groupKey = `${transitMrp}_${batchId}`;
                        if (!batchGroups[groupKey]) {
                            batchGroups[groupKey] = { batch_id: batchId, qty: 0, gross: 0, cogs: 0, slabDeduction: 0, rate: transitRate, mrp: transitMrp };
                        }

                        // Price Slab Deduction Calculation (Transit)
                        if (priceSlabs[pid]) {
                            const targetNet = Number(priceSlabs[pid].special_price);
                            const targetExcl = targetNet / (1 + (taxPct / 100));
                            const unitDeduction = Math.max(0, transitRate - targetExcl);
                            batchGroups[groupKey].slabDeduction += (take * unitDeduction);
                        }

                        await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batchId]);
                        await client.query(`
                            INSERT INTO stock_traceability (batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes)
                            VALUES ($1, $2, $3, 'OUT-TRANSIT', $4, 'Sales Invoice', $5)
                        `, [batchId, pid, -take, invId, `Transit stock for ${invNumber}`]);

                        batchGroups[groupKey].qty += take;
                        batchGroups[groupKey].gross += (take * transitRate);
                        batchGroups[groupKey].cogs += (Number(pMaster.rows[0].purchase_rate) || 0) * take;
                        qtyToFulfill -= take;
                    }

                    // Insert Invoice Lines per Batch Group
                    let remainingFree = freeQty;
                    for (const [key, group] of Object.entries(batchGroups)) {
                        if (group.qty <= 0) continue;

                        const groupFree = Math.min(remainingFree, group.qty);
                        remainingFree -= groupFree;

                        const freeItemValue = groupFree * group.rate;
                        const lineScheme = freeItemValue + group.slabDeduction;

                        const taxableValue = group.gross - lineScheme;
                        const taxValue = taxableValue * (lineTaxPercent / 100);
                        const netValue = taxableValue + taxValue;

                        const reasons = [];
                        if (freeMap[pid]) reasons.push(...freeMap[pid].reasons);
                        if (priceSlabs[pid]) reasons.push(priceSlabs[pid].reason);
                        const lineTier = reasons.length > 0 ? reasons.join(', ') : null;

                        await client.query(`
                            INSERT INTO sales_invoice_lines (
                                invoice_id, product_id, batch_id, shipped_qty, rate, mrp, 
                                gross_amount, scheme_amount, taxable_amount, 
                                tax_percent, tax_amount, amount, tier_applied
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                        `, [
                            invId, pid, group.batch_id, group.qty, group.rate, group.mrp,
                            group.gross, lineScheme, taxableValue,
                            lineTaxPercent, taxValue, netValue, lineTier
                        ]);

                        invTotal += netValue;
                        invTax += taxValue;
                        totalCOGS += group.cogs;
                    }

                    // Update SO Line Dispatch Progress & Shortage
                    if (line) {
                        const shippedForThisLine = paidQty - Math.max(0, qtyToFulfill - freeQty);
                        const finalDispatched = Number(line.dispatched_qty || 0) + shippedForThisLine;
                        const shortage = paidQty - finalDispatched;
                        await client.query(`
                            UPDATE sales_order_lines SET dispatched_qty = $1, cancelled_qty = $2 WHERE id = $3
                        `, [finalDispatched, shortage, line.id]);
                    }
                }

                // 5. Update Totals & Order Status
                if (invTotal === 0) {
                    throw new Error("Zero total invoice amount. Please check if schemes (e.g., Price Slabs) are zeroing out the rates.");
                }

                const roundedTotal = Math.round(invTotal); // Enforce Integer Rounding
                const roundOff = Number((roundedTotal - invTotal).toFixed(2));
                const roundedTax = Number(invTax.toFixed(2));
                const taxable = Number((invTotal - roundedTax).toFixed(2));

                const cgst = Number((roundedTax / 2).toFixed(2));
                const sgst = Number((roundedTax - cgst).toFixed(2));

                await client.query('UPDATE sales_invoices SET grand_total = $1, total_taxable = $2, total_cgst = $3, total_sgst = $4, round_off = $5 WHERE id = $6',
                    [roundedTotal, taxable, cgst, sgst, roundOff, invId]);

                // --- ACCOUNTING INTEGRATION ---
                const acc_revenue = 4001;
                const acc_ar = 1101;
                const acc_gst_cgst = 2011;
                const acc_gst_sgst = 2012;
                const acc_cogs = 5001;
                const acc_inventory = 1001;
                const acc_round = 5003;

                // 1. Invoice Entry (AR vs Sales + GST + Rounding)
                let invoiceLines = [
                    { code: acc_ar, debit: roundedTotal, credit: 0 },
                    { code: acc_revenue, debit: 0, credit: taxable }
                ];
                if (roundedTax > 0) {
                    invoiceLines.push({ code: acc_gst_cgst, debit: 0, credit: cgst });
                    invoiceLines.push({ code: acc_gst_sgst, debit: 0, credit: sgst });
                }

                // Add Rounding Line
                if (roundOff !== 0) {
                    if (roundOff > 0) {
                        // Gain (Credit) e.g. 500.5 -> 501 (+0.5). AR Dr 501. Revenue Cr 500.5. Needs Cr 0.5
                        invoiceLines.push({ code: acc_round, debit: 0, credit: Math.abs(roundOff) });
                    } else {
                        // Loss (Debit) e.g. 500.4 -> 500 (-0.4). AR Dr 500. Revenue Cr 500.4. Needs Dr 0.4
                        invoiceLines.push({ code: acc_round, debit: Math.abs(roundOff), credit: 0 });
                    }
                }

                await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
                    [new Date(), `Sales Invoice: ${invNumber}`, 'SALES_INV', invId, JSON.stringify(invoiceLines)]);

                // 2. COGS Entry (COGS vs Inventory)
                if (totalCOGS > 0) {
                    const roundedCOGS = Number(totalCOGS.toFixed(2));
                    const cogsLines = [
                        { code: acc_cogs, debit: roundedCOGS, credit: 0 },
                        { code: acc_inventory, debit: 0, credit: roundedCOGS }
                    ];
                    await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
                        [new Date(), `COGS for ${invNumber}`, 'COGS', invId, JSON.stringify(cogsLines)]);
                }

                // Mark as Invoiced
                await client.query("UPDATE sales_orders SET status = 'Invoiced' WHERE id = $1", [orderId]);

                await client.query('COMMIT');
                results.push({ id: orderId, order_id: orderId, status: 'Success', invoice_number: invNumber });

            } catch (err) {
                await client.query('ROLLBACK');
                console.error("Bulk Order Error:", err);
                results.push({ id: orderId, order_id: orderId, status: 'Failed', error: err.stack || err.message });
            }
        }
        res.json(results);
    } catch (err) {
        console.error("Bulk Generation Critical Error:", err);
        res.status(500).json({ error: err.stack || err.message });
    } finally {
        client.release();
    }
});

// PUT /api/sales/orders/:id - Update Sales Order Lines
router.put('/orders/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const orderId = req.params.id;
        const { lines } = req.body;
        
        await client.query('BEGIN');
        
        // 1. Wipe existing lines for this order
        await client.query('DELETE FROM sales_order_lines WHERE sales_order_id = $1', [orderId]);
        
        let headerAmount = 0;
        let headerTax = 0;

        // 2. Insert new edited lines
        for (const line of lines) {
            const qty = Number(line.ordered_qty || 0);
            if (qty <= 0) continue; // Skip zero qty or deleted lines
            
            const rate = Number(line.rate || 0);
            const tax_percent = Number(line.tax_percent || 0);
            const gross = qty * rate;
            const tax_amount = gross * (tax_percent / 100);
            const amount = gross + tax_amount;
            
            await client.query(`
                INSERT INTO sales_order_lines (
                    sales_order_id, product_id, ordered_qty, rate, tax_percent, tax_amount, amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [orderId, line.product_id, qty, rate, tax_percent, tax_amount, amount]);
            
            headerAmount += amount;
            headerTax += tax_amount;
        }
        
        // 3. Update Order Header
        await client.query('UPDATE sales_orders SET total_amount = $1, tax_amount = $2 WHERE id = $3', [headerAmount, headerTax, orderId]);
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Sales order updated successfully' });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Order Update Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// POST /api/sales/invoices/:id/unlock-for-edit - Reverses an invoice to unlock its SO
router.post('/invoices/:id/unlock-for-edit', async (req, res) => {
    const client = await pool.connect();
    try {
        const invoiceId = req.params.id;
        await client.query('BEGIN');

        // 1. Validations
        const invRes = await client.query('SELECT * FROM sales_invoices WHERE id = $1', [invoiceId]);
        if (invRes.rows.length === 0) throw new Error('Invoice not found');
        const inv = invRes.rows[0];

        if (Number(inv.paid_amount) > 0) throw new Error('Cannot edit an invoice with existing payments. Remove payments first.');
        if (inv.delivery_status === 'Delivered' || inv.delivery_status === 'In Transit') throw new Error('Cannot edit a dispatched/delivered invoice.');
        if (inv.is_gst_filed) throw new Error('Cannot edit an invoice because GST has already been filed.');
        
        // Date check: <= 10 days
        const invDate = new Date(inv.invoice_date);
        const today = new Date();
        const diffTime = Math.abs(today - invDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays > 10) throw new Error('Cannot edit an invoice older than 10 days.');

        const orderId = inv.sales_order_id;
        if (!orderId) throw new Error('Invoice is not linked to a Sales Order.');

        // 2. Reversal Ledger
        await client.query(`DELETE FROM journal_entries WHERE reference_type = 'SALES_INV' AND reference_id = $1`, [invoiceId]);
        await client.query(`DELETE FROM journal_entries WHERE reference_type = 'COGS' AND reference_id = $1`, [invoiceId]);

        // 3. Reversal Stock
        const traces = await client.query(`SELECT * FROM stock_traceability WHERE reference_type = 'Sales Invoice' AND reference_id = $1`, [invoiceId]);
        for (const trace of traces.rows) {
            if (trace.transaction_type === 'OUT' || trace.transaction_type === 'OUT-TRANSIT') {
                const qtyBack = Math.abs(Number(trace.quantity_change));
                await client.query(`UPDATE inventory_batches SET quantity_remaining = quantity_remaining + $1 WHERE id = $2`, [qtyBack, trace.batch_id]);
                // Delete the trace to wipe the record of the mistake
                await client.query(`DELETE FROM stock_traceability WHERE id = $1`, [trace.id]);
            }
        }

        // 4. Unlink Sales Order
        await client.query(`UPDATE sales_orders SET status = 'Confirmed' WHERE id = $1`, [orderId]);
        await client.query(`UPDATE sales_order_lines SET dispatched_qty = 0, cancelled_qty = 0 WHERE sales_order_id = $1`, [orderId]);

        // 5. Delete Invoice lines and header
        await client.query(`DELETE FROM sales_invoice_lines WHERE invoice_id = $1`, [invoiceId]);
        await client.query(`DELETE FROM sales_invoices WHERE id = $1`, [invoiceId]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Invoice unlocked. Sales Order ready for edit.',
            sales_order_id: orderId,
            original_invoice_number: inv.invoice_number,
            original_invoice_date: inv.invoice_date
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Unlock Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// POST /api/sales/invoices/regenerate - Re-generates an invoice explicitly forcing the old Date and Number
router.post('/invoices/regenerate', async (req, res) => {
    // This is identical to bulk-invoice-generate, except it explicitly forces Number and Date
    let { sales_order_id, original_invoice_number, original_invoice_date } = req.body;
    
    if (!sales_order_id || !original_invoice_number || !original_invoice_date) {
        return res.status(400).json({ error: 'Missing required parameters for regeneration' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch Order Header
        const soRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [sales_order_id]);
        if (soRes.rows.length === 0) throw new Error(`Order ${sales_order_id} not found`);
        const so = soRes.rows[0];
        if (so.status === 'Invoiced') throw new Error(`Order ${so.so_number} already invoiced`);

        // 2. Fetch Order Lines
        const linesRes = await client.query('SELECT * FROM sales_order_lines WHERE sales_order_id = $1', [sales_order_id]);
        let lines = linesRes.rows;

        // Scheme Logic
        const orderedItems = lines.map(l => ({ product_id: l.product_id, qty: l.ordered_qty }));
        const { freeItems, priceSlabs } = await calculateFreeItems(orderedItems, so.customer_id, client);

        const freeMap = {};
        for (const free of freeItems) {
            if (!freeMap[free.product_id]) freeMap[free.product_id] = { qty: 0, reasons: [] };
            freeMap[free.product_id].qty += free.qty;
            freeMap[free.product_id].reasons.push(free.reason);
        }

        // Update Tier Applied
        for (const line of lines) {
            const reasons = [];
            if (freeMap[line.product_id]) reasons.push(...freeMap[line.product_id].reasons);
            if (priceSlabs[line.product_id]) reasons.push(priceSlabs[line.product_id].reason);
            if (reasons.length > 0) {
                await client.query('UPDATE sales_order_lines SET tier_applied = $1 WHERE id = $2', [reasons.join(', '), line.id]);
            }
        }

        // 3. Create Invoice Header (FORCED NUMBER AND DATE)
        const invHeadRes = await client.query(`
            INSERT INTO sales_invoices(invoice_number, sales_order_id, customer_id, status, grand_total, invoice_date)
        VALUES($1, $2, $3, 'Unpaid', 0, $4) RETURNING id
        `, [original_invoice_number, sales_order_id, so.customer_id, original_invoice_date]);
        const invId = invHeadRes.rows[0].id;

        // Pricing Overrides
        const custTierRes = await client.query(`SELECT c.price_column FROM channels c JOIN customers cust ON cust.channel_id = c.id WHERE cust.id = $1`, [so.customer_id]);
        const defaultRateColumn = custTierRes.rows[0]?.price_column || 'dealer_rate';
        const overridesRes = await client.query(`SELECT b.brand_id, ch.price_column FROM customer_brand_pricing b JOIN channels ch ON b.channel_id = ch.id WHERE b.customer_id = $1`, [so.customer_id]);
        const overrideMap = {};
        overridesRes.rows.forEach(r => overrideMap[r.brand_id] = r.price_column);

        let invTotal = 0; let invTax = 0; let totalCOGS = 0;

        // 4. Stock Allocation
        const allPids = new Set([ ...lines.map(l => String(l.product_id)), ...Object.keys(freeMap) ]);
        const pidsArray = Array.from(allPids).map(Number);
        const productsRes = await client.query(`SELECT p.id, p.brand_id, p.tax_id, t.tax_percentage as tax_bracket FROM products p LEFT JOIN taxes t ON p.tax_id = t.id WHERE p.id = ANY($1)`, [pidsArray]);
        const prodMeta = {};
        productsRes.rows.forEach(p => prodMeta[String(p.id)] = p);

        for (const pid of allPids) {
            const line = lines.find(l => String(l.product_id) === pid);
            const freeData = freeMap[pid];
            const freeQty = freeData ? freeData.qty : 0;
            const paidQty = line ? Number(line.ordered_qty) : 0;
            let qtyToFulfill = paidQty + freeQty;

            if (qtyToFulfill <= 0) continue;
            const pInfo = prodMeta[pid];
            if (!pInfo) continue;

            const brandId = pInfo.brand_id;
            const taxPct = Number(pInfo.tax_bracket || 0);
            const rateColumn = overrideMap[brandId] || defaultRateColumn;
            const lineTaxRaw = line ? Number(line.tax_percent) : 0;
            const lineTaxPercent = lineTaxRaw > 0 ? lineTaxRaw : taxPct;

            const batchesRes = await client.query(`
                SELECT id, quantity_remaining, mrp, purchase_rate,
                        distributor_rate, wholesale_rate, dealer_rate, retail_rate
                FROM inventory_batches 
                WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true
                ORDER BY created_at ASC FOR UPDATE
            `, [pid]);

            const batchGroups = {};
            for (const batch of batchesRes.rows) {
                if (qtyToFulfill <= 0) break;
                const take = Math.min(qtyToFulfill, batch.quantity_remaining);
                const batchRate = Number(batch[rateColumn]) || 0;
                const batchMrp = Number(batch.mrp || 0);
                const batchId = batch.id;

                const groupKey = `${batchMrp}_${batchId}`;
                if (!batchGroups[groupKey]) {
                    batchGroups[groupKey] = { batch_id: batchId, qty: 0, gross: 0, cogs: 0, slabDeduction: 0, rate: batchRate, mrp: batchMrp };
                }

                if (priceSlabs[pid]) {
                    const targetNet = Number(priceSlabs[pid].special_price);
                    const targetExcl = targetNet / (1 + (taxPct / 100));
                    const unitDeduction = Math.max(0, batchRate - targetExcl);
                    batchGroups[groupKey].slabDeduction += (take * unitDeduction);
                }

                await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batchId]);
                await client.query(`
                    INSERT INTO stock_traceability(batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type)
                    VALUES($1, $2, ($3 * -1)::numeric, 'OUT', $4, 'Sales Invoice')
                `, [batchId, pid, take, invId]);


                batchGroups[groupKey].qty += take;
                batchGroups[groupKey].gross += (take * batchRate);
                batchGroups[groupKey].cogs += (Number(batch.purchase_rate) || 0) * take;
                qtyToFulfill -= take;
            }

            // Insert Invoice Lines per Batch Group
            let remainingFree = freeQty;
            for (const [key, group] of Object.entries(batchGroups)) {
                if (group.qty <= 0) continue;

                const groupFree = Math.min(remainingFree, group.qty);
                remainingFree -= groupFree;

                const freeItemValue = groupFree * group.rate;
                const lineScheme = freeItemValue + group.slabDeduction;

                const taxableValue = group.gross - lineScheme;
                const taxValue = taxableValue * (taxPct / 100);
                const netValue = taxableValue + taxValue;

                const reasons = [];
                if (freeMap[pid]) reasons.push(...freeMap[pid].reasons);
                if (priceSlabs[pid]) reasons.push(priceSlabs[pid].reason);
                const lineTier = reasons.length > 0 ? reasons.join(', ') : null;

                await client.query(`
                    INSERT INTO sales_invoice_lines (
                        invoice_id, product_id, batch_id, shipped_qty, rate, mrp, 
                        gross_amount, scheme_amount, taxable_amount, 
                        tax_percent, tax_amount, amount, tier_applied
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `, [
                    invId, pid, group.batch_id, group.qty, group.rate, group.mrp,
                    group.gross, lineScheme, taxableValue,
                    lineTaxPercent, taxValue, netValue, lineTier
                ]);

                invTotal += netValue; invTax += taxValue; totalCOGS += group.cogs;
            }

            if (line) {
                const shippedForThisLine = paidQty - Math.max(0, qtyToFulfill - freeQty);
                const finalDispatched = Number(line.dispatched_qty || 0) + shippedForThisLine;
                const shortage = paidQty - finalDispatched;
                await client.query(`UPDATE sales_order_lines SET dispatched_qty = $1, cancelled_qty = $2 WHERE id = $3`, [finalDispatched, shortage, line.id]);
            }
        }

        if (invTotal === 0) throw new Error("Zero stock available for this order. No invoice generated.");

        const roundedTotal = Math.round(invTotal);
        const roundOff = Number((roundedTotal - invTotal).toFixed(2));
        const roundedTax = Number(invTax.toFixed(2));
        const taxable = Number((roundedTotal - roundedTax - roundOff).toFixed(2));
        const cgst = Number((roundedTax / 2).toFixed(2));
        const sgst = Number((roundedTax - cgst).toFixed(2));

        await client.query('UPDATE sales_invoices SET grand_total = $1, total_taxable = $2, total_cgst = $3, total_sgst = $4, round_off = $5 WHERE id = $6', [roundedTotal, taxable, cgst, sgst, roundOff, invId]);

        // Accounting 
        const acc_revenue = 4001; const acc_ar = 1101; const acc_gst_cgst = 2011; const acc_gst_sgst = 2012; const acc_cogs = 5001; const acc_inventory = 1001; const acc_round = 5003;

        let invoiceLines = [{ code: acc_ar, debit: roundedTotal, credit: 0 }, { code: acc_revenue, debit: 0, credit: taxable }];
        if (roundedTax > 0) { invoiceLines.push({ code: acc_gst_cgst, debit: 0, credit: cgst }); invoiceLines.push({ code: acc_gst_sgst, debit: 0, credit: sgst }); }
        if (roundOff !== 0) {
            if (roundOff > 0) invoiceLines.push({ code: acc_round, debit: 0, credit: Math.abs(roundOff) });
            else invoiceLines.push({ code: acc_round, debit: Math.abs(roundOff), credit: 0 });
        }

        await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)', [new Date(), 'Regenerated Invoice: ' + original_invoice_number, 'SALES_INV', invId, JSON.stringify(invoiceLines)]);

        if (totalCOGS > 0) {
            const roundedCOGS = Number(totalCOGS.toFixed(2));
            const cogsLines = [{ code: acc_cogs, debit: roundedCOGS, credit: 0 }, { code: acc_inventory, debit: 0, credit: roundedCOGS }];
            await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)', [new Date(), 'COGS for ' + original_invoice_number, 'COGS', invId, JSON.stringify(cogsLines)]);
        }

        await client.query("UPDATE sales_orders SET status = 'Invoiced' WHERE id = $1", [sales_order_id]);
        await client.query('COMMIT');
        
        res.json({ success: true, status: 'Success', invoice_number: original_invoice_number });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Regenerate Error:", err);
        res.status(500).json({ error: err.stack || err.message });
    } finally {
        client.release();
    }
});


module.exports = router;
