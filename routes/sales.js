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
                    c.customer_name, c.address_line1 as customer_address, c.gst as customer_gst, c.phone as customer_phone,
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
                WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true
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
        const { invoice_date } = req.body; // Optional override

        await client.query('BEGIN');

        // 1. Fetch Order & Lines
        const soRes = await client.query('SELECT * FROM sales_orders WHERE id = $1', [id]);
        if (soRes.rows.length === 0) throw new Error('Order not found');
        const so = soRes.rows[0];

        if (so.status === 'Invoiced') throw new Error('Order already invoiced');

        const linesRes = await client.query('SELECT * FROM sales_order_lines WHERE sales_order_id = $1', [id]);
        let lines = linesRes.rows;

        // [NEW] 1.5 SCHEME LOGIC: Calculate & Merge Free Lines
        const orderedItems = lines.map(l => ({ product_id: l.product_id, qty: l.ordered_qty }));
        const freeItems = await calculateFreeItems(orderedItems);

        // Merge Logic: Instead of adding new lines, we update the existing line's quantity and scheme_amount
        // Map free items by Product ID for easier lookup
        const freeMap = {};
        freeItems.forEach(f => {
            if (!freeMap[f.product_id]) freeMap[f.product_id] = { qty: 0, reason: [] };
            freeMap[f.product_id].qty += f.qty;
            freeMap[f.product_id].reason.push(f.reason);
        });

        // -----------------------------------------------------

        // 2. Prepare Invoice Totals
        let invTotal = 0;
        let invTax = 0;
        let totalCOGS = 0;

        // 3. Generate Invoice Number (INV-YY-SEQ)
        const yy = new Date().getFullYear().toString().slice(-2);
        // Flexible search to find old formats (with spaces/dashes)
        const seqRes = await client.query("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number LIKE $1 OR invoice_number LIKE $2", [`INV-${yy}-%`, `INV - ${yy} -%`]);
        const nextSeq = parseInt(seqRes.rows[0].count) + 1;
        const invNumber = `INV-${yy}-${String(nextSeq).padStart(4, '0')}`;

        // 4. Create Invoice Header
        const invHeadRes = await client.query(`
                INSERT INTO sales_invoices (
                    invoice_number, sales_order_id, customer_id, invoice_date, 
                    status, grand_total
                ) VALUES ($1, $2, $3, $4, 'Unpaid', 0)
                RETURNING id
            `, [
            invNumber, id, so.customer_id, invoice_date || new Date()
        ]);
        const invId = invHeadRes.rows[0].id;

        // [NEW] 1.7 Fetch Pricing Tiers & Brand Overrides
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

        // 5. Process Each Line: Deduct Stock & Create Audit
        for (const line of lines) {
            // Determine Total Qty (Original + Free)
            const orderedQty = Number(line.ordered_qty);
            const freeData = freeMap[line.product_id];
            const freeQty = freeData ? freeData.qty : 0;
            const totalQty = orderedQty + freeQty; // e.g. 12 + 1 = 13

            let qtyToFulfill = totalQty;
            const pid = String(line.product_id);

            // Fetch Product Brand for Tier Selection
            const prodInfo = await client.query('SELECT brand_id FROM products WHERE id = $1', [pid]);
            const brandId = prodInfo.rows[0]?.brand_id;
            const rateColumn = overrideMap[brandId] || defaultRateColumn;

            // FIFO Allocation Logic
            const batchesRes = await client.query(`
                    SELECT id, quantity_remaining, purchase_rate, mrp,
                           distributor_rate, wholesale_rate, dealer_rate, retail_rate
                    FROM inventory_batches 
                    WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true
                    ORDER BY created_at ASC
                    FOR UPDATE
                `, [pid]);

            // We need to calculate weighted average rate if multiple batches used, 
            // BUT for scheme calculation, we usually use the "Standard Rate" of the line.
            // However, detailed breakdown needs to be per-line. 
            // We'll process batch allocation but sum up the financials for the Invoice Line.

            let lineGross = 0;
            let lineScheme = 0;
            let lineTaxable = 0;
            let lineTaxAmt = 0;
            let lineTotal = 0;
            let fulfilledQty = 0;

            for (const batch of batchesRes.rows) {
                if (qtyToFulfill <= 0) break;

                const batchRate = Number(batch[rateColumn]) || 0;
                const take = Math.min(qtyToFulfill, batch.quantity_remaining);

                await client.query(`UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2`, [take, batch.id]);
                await client.query(`
                        INSERT INTO stock_traceability (batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes)
                        VALUES ($1, $2, $3, 'OUT', $4, 'Sales Invoice', $5)
                    `, [batch.id, pid, -take, invId, `Allocated to ${invNumber}`]);

                // --- CALCULATION LOGIC (Per Batch Chunk) ---
                // This chunk represents 'take' quantity.
                // We need to apportion the 'Free Qty' benefit across the total qty? 
                // Or is Free Qty distinct? 
                // User says: "in the qty column 13 pcs... in the scheme column, free qty*unit price"

                // Ratio of this batch to total line qty
                const ratio = take / totalQty;

                const chunkGross = take * batchRate;
                const chunkScheme = (freeQty * batchRate) * ratio; // Pro-rate scheme deduction
                // Discount? (Assuming 0 for now as not in payload yet)

                const chunkTaxable = chunkGross - chunkScheme;

                const lineTaxPercent = Number(line.tax_percent) || 0;
                // Tax on Taxable Amount
                const chunkTaxVal = chunkTaxable * (lineTaxPercent / 100);
                const chunkTotal = chunkTaxable + chunkTaxVal;

                lineGross += chunkGross;
                lineScheme += chunkScheme;
                lineTaxable += chunkTaxable;
                lineTaxAmt += chunkTaxVal;
                lineTotal += chunkTotal;
                totalCOGS += (Number(batch.purchase_rate) || 0) * take;

                fulfilledQty += take;
                qtyToFulfill -= take;
            }

            if (fulfilledQty > 0) {
                // Save the Unified Line
                await client.query(`
                        INSERT INTO sales_invoice_lines (
                            invoice_id, product_id, shipped_qty, rate, 
                            gross_amount, scheme_amount, taxable_amount,
                            tax_percent, tax_amount, amount
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [
                    invId, pid, fulfilledQty, Number(line.rate), // Use original rate as ref
                    Number(lineGross.toFixed(2)),
                    Number(lineScheme.toFixed(2)),
                    Number(lineTaxable.toFixed(2)),
                    Number(line.tax_percent),
                    Number(lineTaxAmt.toFixed(2)),
                    Number(lineTotal.toFixed(2))
                ]);

                invTotal += lineTotal;
                invTax += lineTaxAmt;

                // Update SO Line Dispatch Progress
                // Note: We dispatched 'fulfilledQty', but 'ordered_qty' was only the paid portion.
                // We should track based on 'ordered_qty' logic or just mark complete?
                // Typically SO line completion tracks the 'ordered' amount. 
                // If we ship 13 (12+1), we effectively shipped 12 "ordered" units.
                // Let's cap the update to ordered_qty to avoid confusion, or track total.
                // Let's assume strict tracking:
                const shippedOrderedPortion = fulfilledQty - (freeQty * (fulfilledQty / totalQty)); // Approx

                // Simple approach: Just mark what we can.
                const finalDispatched = Number(line.dispatched_qty || 0) + fulfilledQty; // Tracking physical units
                await client.query(`
                        UPDATE sales_order_lines 
                        SET dispatched_qty = $1 
                        WHERE id = $2
                    `, [finalDispatched, line.id]);
            }
        }

        // 6. Update Invoice Totals
        if (invTotal === 0) {
            throw new Error("Zero stock available for this order. No invoice generated.");
        }

        const roundedTotal = Number(invTotal.toFixed(2));
        const roundedTax = Number(invTax.toFixed(2));
        const taxable = Number((roundedTotal - roundedTax).toFixed(2));
        const cgst = Number((roundedTax / 2).toFixed(2));
        const sgst = Number((roundedTax - cgst).toFixed(2));

        await client.query(`
            UPDATE sales_invoices 
            SET grand_total = $1, total_taxable = $2, total_cgst = $3, total_sgst = $4 
            WHERE id = $5
        `, [roundedTotal, taxable, cgst, sgst, invId]);

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
        const yy = new Date().getFullYear().toString().slice(-2);
        const seqRes = await client.query("SELECT COUNT(*) FROM sales_returns WHERE return_number LIKE $1", [`SRN - ${yy} -% `]);
        const nextSeq = parseInt(seqRes.rows[0].count) + 1;
        const returnNumber = `SRN - ${yy} - ${String(nextSeq).padStart(4, '0')}`;

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

                // [NEW] 1.5 SCHEME LOGIC (Bulk)
                const orderedItems = lines.map(l => ({ product_id: l.product_id, qty: l.ordered_qty }));
                const freeItems = await calculateFreeItems(orderedItems, client);

                for (const free of freeItems) {
                    const resFreeLine = await client.query(`
                        INSERT INTO sales_order_lines(
                        sales_order_id, product_id, ordered_qty, rate,
                        tax_percent, tax_amount, amount, tier_applied
                    ) VALUES($1, $2, $3, 0, 0, 0, 0, 'Scheme: ' || $4)
                        RETURNING *
                    `, [id, free.product_id, free.qty, free.reason]);
                    lines.push(resFreeLine.rows[0]);
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

                // 4. FIFO Stock Allocation
                for (const line of lines) {
                    const orderedQty = Number(line.ordered_qty);
                    let qtyToFulfill = orderedQty;
                    const pid = line.product_id;

                    // Fetch Rate Column
                    const prodInfo = await client.query('SELECT brand_id, tax_id FROM products WHERE id = $1', [pid]);
                    const brandId = prodInfo.rows[0]?.brand_id;
                    const rateColumn = overrideMap[brandId] || defaultRateColumn;
                    const lineTaxPercent = Number(line.tax_percent) || 0;

                    const batchesRes = await client.query(`
                        SELECT id, quantity_remaining, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate
                        FROM inventory_batches 
                        WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true
                        ORDER BY created_at ASC FOR UPDATE
                    `, [pid]);

                    for (const batch of batchesRes.rows) {
                        if (qtyToFulfill <= 0) break;
                        const take = Math.min(qtyToFulfill, batch.quantity_remaining);
                        // For bulk dispatch, we use the rate ALREADY on the line (unlike bulk-generate which recalcs)
                        const batchRate = Number(line.rate) || 0;

                        await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batch.id]);
                        await client.query(`
                            INSERT INTO stock_traceability(batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes)
                            VALUES($1, $2, $3, 'OUT', $4, 'Sales Invoice', $5)
                        `, [batch.id, pid, -take, invId, `Bulk Dispatch for ${invNumber} (${rateColumn})`]);

                        // Record Line
                        const chunkAmount = (batchRate * take) * (1 + (lineTaxPercent / 100));
                        const chunkTax = chunkAmount - (batchRate * take);

                        await client.query(`
                            INSERT INTO sales_invoice_lines (invoice_id, product_id, shipped_qty, rate, tax_percent, tax_amount, amount)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                        `, [invId, pid, take, batchRate, lineTaxPercent, chunkTax, chunkAmount]);

                        invTotal += chunkAmount;
                        invTax += chunkTax;
                        totalCOGS += (Number(batch.purchase_rate) || 0) * take;
                        qtyToFulfill -= take;
                    }

                    // Update SO Line Dispatch Progress
                    const shippedQty = orderedQty - qtyToFulfill;
                    const finalDispatched = Number(line.dispatched_qty || 0) + shippedQty;
                    const shortage = orderedQty - finalDispatched;
                    await client.query(`
                        UPDATE sales_order_lines SET dispatched_qty = $1, cancelled_qty = $2 WHERE id = $3
                    `, [finalDispatched, shortage, line.id]);
                }

                // 5. Finalize
                if (invTotal === 0) {
                    throw new Error("Zero stock available for this order.");
                }

                const roundedTotal = Number(invTotal.toFixed(2));
                const roundedTax = Number(invTax.toFixed(2));
                const taxable = Number((roundedTotal - roundedTax).toFixed(2));
                const cgst = Number((roundedTax / 2).toFixed(2));
                const sgst = Number((roundedTax - cgst).toFixed(2));

                await client.query(`
                    UPDATE sales_invoices 
                    SET grand_total = $1, total_taxable = $2, total_cgst = $3, total_sgst = $4 
                    WHERE id = $5
                `, [roundedTotal, taxable, cgst, sgst, invId]);

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
                await client.query('BEGIN');

                // 1. Fetch Order Header
                const soRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [orderId]);
                if (soRes.rows.length === 0) throw new Error(`Order ${orderId} not found`);
                const so = soRes.rows[0];
                if (so.status === 'Invoiced') throw new Error(`Order ${so.so_number} already invoiced`);

                // 2. Fetch Order Lines
                const linesRes = await client.query('SELECT * FROM sales_order_lines WHERE sales_order_id = $1', [orderId]);
                let lines = linesRes.rows;

                // 2.5 Calculate Schemes (Free Items)
                const orderedItems = lines.map(l => ({ product_id: l.product_id, qty: l.ordered_qty }));
                const freeItems = await calculateFreeItems(orderedItems, client);
                for (const free of freeItems) {
                    const resFree = await client.query(`
                        INSERT INTO sales_order_lines(sales_order_id, product_id, ordered_qty, rate, tax_percent, tax_amount, amount, tier_applied)
                VALUES($1, $2, $3, 0, 0, 0, 0, 'Scheme: ' || $4)
                RETURNING *
                    `, [orderId, free.product_id, free.qty, free.reason]);
                    lines.push(resFree.rows[0]);
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

                // 4. Stock Allocation (Real FIFO + Transit Fallback)
                for (const line of lines) {
                    const orderedQty = Number(line.ordered_qty);
                    let qtyToFulfill = orderedQty;
                    const pid = String(line.product_id);

                    const prodInfo = await client.query('SELECT brand_id, tax_id FROM products WHERE id = $1', [pid]);
                    const brandId = prodInfo.rows[0]?.brand_id;
                    const rateColumn = overrideMap[brandId] || defaultRateColumn;
                    const lineTaxPercent = Number(line.tax_percent) || 0;

                    // A. Check REAL Inventory Batches
                    const batchesRes = await client.query(`
                        SELECT id, quantity_remaining, mrp, purchase_rate,
                               distributor_rate, wholesale_rate, dealer_rate, retail_rate
                        FROM inventory_batches 
                        WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true
                        ORDER BY created_at ASC FOR UPDATE
                    `, [pid]);

                    for (const batch of batchesRes.rows) {
                        if (qtyToFulfill <= 0) break;
                        const take = Math.min(qtyToFulfill, batch.quantity_remaining);
                        const batchRate = Number(batch[rateColumn]) || 0;

                        await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batch.id]);
                        await client.query(`
                            INSERT INTO stock_traceability (batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes)
                            VALUES ($1, $2, $3, 'OUT', $4, 'Sales Invoice', $5)
                        `, [batch.id, pid, -take, invId, `Real stock for ${invNumber} (${rateColumn})`]);

                        // Record Line
                        const chunkAmount = (batchRate * take) * (1 + (lineTaxPercent / 100));
                        const chunkTax = chunkAmount - (batchRate * take);

                        await client.query(`
                            INSERT INTO sales_invoice_lines (invoice_id, product_id, shipped_qty, rate, tax_percent, tax_amount, amount)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                        `, [invId, pid, take, batchRate, lineTaxPercent, chunkTax, chunkAmount]);

                        invTotal += chunkAmount;
                        invTax += chunkTax;
                        totalCOGS += (Number(batch.purchase_rate) || 0) * take;
                        qtyToFulfill -= take;
                    }

                    // B. If still needed, check TRANSIT stock from frontend
                    if (qtyToFulfill > 0 && transitMap[pid]) {
                        const transit = transitMap[pid];
                        const take = Math.min(qtyToFulfill, Number(transit.qty));

                        // For transit, we get the tier rate from the Product Master as a fallback
                        const pMaster = await client.query(`SELECT ${rateColumn} FROM products WHERE id = $1`, [pid]);
                        const transitRate = Number(pMaster.rows[0][rateColumn]) || 0;

                        // Deduct from transit "allowance" in memory for this session
                        transitMap[pid].qty -= take;

                        let batchId;
                        const existingBatch = await client.query('SELECT id FROM inventory_batches WHERE product_id = $1 AND batch_code = $2', [pid, transit.batch_code]);
                        if (existingBatch.rows.length > 0) {
                            batchId = existingBatch.rows[0].id;
                        } else {
                            const prodRes = await client.query('SELECT mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate FROM products WHERE id = $1', [pid]);
                            const p = prodRes.rows[0];
                            const newBatch = await client.query(`
                                INSERT INTO inventory_batches (
                                    product_id, batch_code, quantity_remaining, purchase_rate, mrp, 
                                    distributor_rate, wholesale_rate, dealer_rate, retail_rate, is_active
                                ) VALUES ($1, $2, 0, $3, $4, $5, $6, $7, $8, false) RETURNING id
                            `, [pid, transit.batch_code, p.purchase_rate, p.mrp, p.distributor_rate, p.wholesale_rate, p.dealer_rate, p.retail_rate]);
                            batchId = newBatch.rows[0].id;
                        }

                        await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batchId]);
                        await client.query(`
                            INSERT INTO stock_traceability (batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes)
                            VALUES ($1, $2, $3, 'OUT-TRANSIT', $4, 'Sales Invoice', $5)
                        `, [batchId, pid, -take, invId, `Transit stock (${transit.batch_code}) for ${invNumber} (${rateColumn})`]);

                        // Record Line for Transit chunk
                        const transitChunkAmount = (transitRate * take) * (1 + (lineTaxPercent / 100));
                        const transitChunkTax = transitChunkAmount - (transitRate * take);

                        await client.query(`
                            INSERT INTO sales_invoice_lines (invoice_id, product_id, shipped_qty, rate, tax_percent, tax_amount, amount)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                        `, [invId, pid, take, transitRate, lineTaxPercent, transitChunkTax, transitChunkAmount]);

                        invTotal += transitChunkAmount;
                        invTax += transitChunkTax;
                        // Transit COGS uses Product Master purchase rate
                        const prodP = await client.query('SELECT purchase_rate FROM products WHERE id = $1', [pid]);
                        totalCOGS += (Number(prodP.rows[0]?.purchase_rate) || 0) * take;
                        qtyToFulfill -= take;
                    }

                    // Update SO Line Dispatch Progress & Shortage
                    const shippedQty = orderedQty - qtyToFulfill;
                    const finalDispatched = Number(line.dispatched_qty || 0) + shippedQty;
                    const shortage = orderedQty - finalDispatched;
                    await client.query(`
                        UPDATE sales_order_lines 
                        SET dispatched_qty = $1, cancelled_qty = $2 
                        WHERE id = $3
                    `, [finalDispatched, shortage, line.id]);
                }

                // 5. Update Totals & Order Status
                if (invTotal === 0) {
                    throw new Error("Zero stock available for this order. No invoice generated.");
                }

                const roundedTotal = Number(invTotal.toFixed(2));
                const roundedTax = Number(invTax.toFixed(2));
                const taxable = Number((roundedTotal - roundedTax).toFixed(2));
                const cgst = Number((roundedTax / 2).toFixed(2));
                const sgst = Number((roundedTax - cgst).toFixed(2));

                await client.query('UPDATE sales_invoices SET grand_total = $1, total_taxable = $2, total_cgst = $3, total_sgst = $4 WHERE id = $5', [roundedTotal, taxable, cgst, sgst, invId]);

                // --- ACCOUNTING INTEGRATION ---
                const acc_revenue = 4001;
                const acc_ar = 1101;
                const acc_gst_cgst = 2011;
                const acc_gst_sgst = 2012;
                const acc_cogs = 5001;
                const acc_inventory = 1001;

                // 1. Invoice Entry (AR vs Sales + GST)
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

module.exports = router;
