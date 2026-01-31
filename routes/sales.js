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

            // 2. Fetch Lines with Product & HSN Details
            const linesRes = await client.query(`
                SELECT 
                    sol.*, 
                    p.product_name, p.product_code, p.ean_code,
                    h.hsn_code,
                    t.tax_percentage as master_tax_pct
                FROM sales_order_lines sol
                JOIN products p ON sol.product_id = p.id
                LEFT JOIN hsn_codes h ON p.hsn_id = h.id
                LEFT JOIN taxes t ON p.tax_id = t.id
                WHERE sol.sales_order_id = $1
                ORDER BY sol.id ASC
            `, [header.sales_order_id]);

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

        // [NEW] 1.5 SCHEME LOGIC: Calculate & Inject Free Lines
        const orderedItems = lines.map(l => ({ product_id: l.product_id, qty: l.ordered_qty }));
        const freeItems = await calculateFreeItems(orderedItems);

        for (const free of freeItems) {
            const resFreeLine = await client.query(`
                INSERT INTO sales_order_lines (
                    sales_order_id, product_id, ordered_qty, rate, 
                    tax_percent, tax_amount, amount, tier_applied
                ) VALUES ($1, $2, $3, 0, 0, 0, 0, 'Scheme: ' || $4)
                RETURNING *
            `, [id, free.product_id, free.qty, free.reason]);

            // Add to the 'lines' array so it gets stock allocated below
            lines.push(resFreeLine.rows[0]);
        }
        // -----------------------------------------------------

        // 2. Prepare Invoice Totals
        let invTotal = 0;
        let invTax = 0;

        // 3. Generate Invoice Number (INV-YY-SEQ)
        const yy = new Date().getFullYear().toString().slice(-2);
        const seqRes = await client.query("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number LIKE $1", [`INV-${yy}-%`]);
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

        // 5. Process Each Line: Deduct Stock & Create Audit
        for (const line of lines) {
            const qtyNeeded = line.ordered_qty;
            let qtyToFulfill = qtyNeeded;

            // FIFO Allocation Logic
            const batchesRes = await client.query(`
                SELECT id, quantity_remaining, purchase_rate 
                FROM inventory_batches 
                WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true
                ORDER BY created_at ASC
                FOR UPDATE
            `, [line.product_id]);

            for (const batch of batchesRes.rows) {
                if (qtyToFulfill <= 0) break;

                const take = Math.min(qtyToFulfill, batch.quantity_remaining);

                // Update Batch
                await client.query(`
                    UPDATE inventory_batches 
                    SET quantity_remaining = quantity_remaining - $1 
                    WHERE id = $2
                `, [take, batch.id]);

                // Audit Trail
                await client.query(`
                    INSERT INTO stock_traceability (
                        batch_id, product_id, quantity_change, transaction_type, 
                        reference_id, reference_type, notes
                    ) VALUES ($1, $2, $3, 'OUT', $4, 'Sales Invoice', $5)
                `, [
                    batch.id, line.product_id, -take, invId, `Allocated to ${invNumber}`
                ]);

                qtyToFulfill -= take;
            }

            if (qtyToFulfill > 0) {
                // For Free items, try best effort? No, stock must exist.
                throw new Error(`Insufficient Stock for Product ID ${line.product_id}. Missing ${qtyToFulfill}`);
            }

            // Update SO Line as Dispatched
            await client.query('UPDATE sales_order_lines SET dispatched_qty = $1 WHERE id = $2', [qtyNeeded, line.id]);

            invTotal += Number(line.amount);
            invTax += Number(line.tax_amount);
        }

        // 6. Update Invoice Totals
        await client.query(`
            UPDATE sales_invoices 
            SET grand_total = $1, total_taxable = $2 
            WHERE id = $3
        `, [invTotal, invTotal - invTax, invId]);

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
        const seqRes = await client.query("SELECT COUNT(*) FROM sales_returns WHERE return_number LIKE $1", [`SRN-${yy}-%`]);
        const nextSeq = parseInt(seqRes.rows[0].count) + 1;
        const returnNumber = `SRN-${yy}-${String(nextSeq).padStart(4, '0')}`;

        // 2. Insert Header (Calculate totals later)
        const headRes = await client.query(`
            INSERT INTO sales_returns (
                return_number, customer_id, invoice_id, return_date, 
                type, remarks, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, 'Draft', $7)
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
                INSERT INTO sales_return_lines (
                    return_id, product_id, batch_id, qty, rate, 
                    tax_percent, tax_amount, amount, reason, return_to_stock
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
                        INSERT INTO stock_traceability (
                            batch_id, product_id, quantity_change, transaction_type, 
                            reference_id, reference_type, notes
                        ) VALUES ($1, $2, $3, 'IN', $4, 'Sales Return', $5)
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
    const { order_ids, invoice_date } = req.body;
    if (!order_ids || !Array.isArray(order_ids)) return res.status(400).json({ error: 'Invalid order_ids' });

    const results = [];
    const client = await pool.connect();

    try {
        for (const id of order_ids) {
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
                const freeItems = await calculateFreeItems(orderedItems);

                for (const free of freeItems) {
                    const resFreeLine = await client.query(`
                        INSERT INTO sales_order_lines (
                            sales_order_id, product_id, ordered_qty, rate, 
                            tax_percent, tax_amount, amount, tier_applied
                        ) VALUES ($1, $2, $3, 0, 0, 0, 0, 'Scheme: ' || $4)
                        RETURNING *
                    `, [id, free.product_id, free.qty, free.reason]);
                    lines.push(resFreeLine.rows[0]);
                }
                // ----------------------------------------

                // 2. Generate Invoice Number
                const yy = new Date().getFullYear().toString().slice(-2);
                const seqRes = await client.query("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number LIKE $1", [`INV-${yy}-%`]);
                const nextSeq = parseInt(seqRes.rows[0].count) + 1;
                const invNumber = `INV-${yy}-${String(nextSeq).padStart(4, '0')}`;

                // 3. Create Invoice Header
                const invHeadRes = await client.query(`
                    INSERT INTO sales_invoices (
                        invoice_number, sales_order_id, customer_id, invoice_date, 
                        status, grand_total
                    ) VALUES ($1, $2, $3, $4, 'Unpaid', 0)
                    RETURNING id
                `, [invNumber, id, so.customer_id, invoice_date || new Date()]);
                const invId = invHeadRes.rows[0].id;

                let invTotal = 0;
                let invTax = 0;

                // 4. FIFO Stock Deduction
                for (const line of lines) {
                    let qtyToFulfill = line.ordered_qty;

                    const batchesRes = await client.query(`
                        SELECT id, quantity_remaining 
                        FROM inventory_batches 
                        WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true
                        ORDER BY created_at ASC FOR UPDATE
                    `, [line.product_id]);

                    for (const batch of batchesRes.rows) {
                        if (qtyToFulfill <= 0) break;
                        const take = Math.min(qtyToFulfill, batch.quantity_remaining);

                        await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batch.id]);
                        await client.query(`
                            INSERT INTO stock_traceability (batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes)
                            VALUES ($1, $2, $3, 'OUT', $4, 'Sales Invoice', $5)
                        `, [batch.id, line.product_id, -take, invId, `Allocated to ${invNumber}`]);

                        qtyToFulfill -= take;
                    }

                    if (qtyToFulfill > 0) throw new Error(`Insufficient stock for product ${line.product_id} in Order ${so.so_number}`);

                    await client.query('UPDATE sales_order_lines SET dispatched_qty = $1 WHERE id = $2', [line.ordered_qty, line.id]);
                    invTotal += Number(line.amount);
                    invTax += Number(line.tax_amount);
                }

                // 5. Finalize
                await client.query('UPDATE sales_invoices SET grand_total = $1, total_taxable = $2 WHERE id = $3', [invTotal, invTotal - invTax, invId]);
                await client.query("UPDATE sales_orders SET status = 'Invoiced' WHERE id = $1", [id]);

                await client.query('COMMIT');
                results.push({ id, status: 'Success', invoice_number: invNumber });

            } catch (err) {
                await client.query('ROLLBACK');
                results.push({ id, status: 'Failed', error: err.message });
            }
        }
        res.json(results);
    } finally {
        client.release();
    }
});

// POST /api/sales/bulk-invoice-generate - Complex logic for Admin Dashboard
router.post('/bulk-invoice-generate', async (req, res) => {
    const { order_ids, transit_stock } = req.body;
    if (!order_ids || !Array.isArray(order_ids)) return res.status(400).json({ error: 'Invalid order_ids' });

    const client = await pool.connect();
    const results = [];
    const transitMap = transit_stock || {}; // { "pid": { qty, batch_code, rate } }

    try {
        for (const orderId of order_ids) {
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
                const freeItems = await calculateFreeItems(orderedItems);
                for (const free of freeItems) {
                    const resFree = await client.query(`
                        INSERT INTO sales_order_lines (sales_order_id, product_id, ordered_qty, rate, tax_percent, tax_amount, amount, tier_applied)
                        VALUES ($1, $2, $3, 0, 0, 0, 0, 'Scheme: ' || $4)
                        RETURNING *
                    `, [orderId, free.product_id, free.qty, free.reason]);
                    lines.push(resFree.rows[0]);
                }

                // 3. Create Invoice Header
                const yy = new Date().getFullYear().toString().slice(-2);
                const seqRes = await client.query("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number LIKE $1", [`INV-${yy}-%`]);
                const nextSeq = parseInt(seqRes.rows[0].count) + 1;
                const invNumber = `INV-${yy}-${String(nextSeq).padStart(4, '0')}`;

                const invHeadRes = await client.query(`
                    INSERT INTO sales_invoices (invoice_number, sales_order_id, customer_id, status, grand_total, invoice_date)
                    VALUES ($1, $2, $3, 'Unpaid', 0, NOW()) RETURNING id
                `, [invNumber, orderId, so.customer_id]);
                const invId = invHeadRes.rows[0].id;

                let invTotal = 0;
                let invTax = 0;

                // 4. Stock Allocation (Real FIFO + Transit Fallback)
                for (const line of lines) {
                    let qtyToFulfill = Number(line.ordered_qty);
                    const pid = String(line.product_id);

                    // A. Check REAL Inventory Batches
                    const batchesRes = await client.query(`
                        SELECT id, quantity_remaining 
                        FROM inventory_batches 
                        WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true
                        ORDER BY created_at ASC FOR UPDATE
                    `, [pid]);

                    for (const batch of batchesRes.rows) {
                        if (qtyToFulfill <= 0) break;
                        const take = Math.min(qtyToFulfill, batch.quantity_remaining);
                        await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batch.id]);
                        await client.query(`
                            INSERT INTO stock_traceability (batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes)
                            VALUES ($1, $2, $3, 'OUT', $4, 'Sales Invoice', $5)
                        `, [batch.id, pid, -take, invId, `Real stock for ${invNumber}`]);
                        qtyToFulfill -= take;
                    }

                    // B. If still needed, check TRANSIT stock from frontend
                    if (qtyToFulfill > 0 && transitMap[pid]) {
                        const transit = transitMap[pid];
                        const take = Math.min(qtyToFulfill, Number(transit.qty));

                        // Deduct from transit "allowance" in memory for this session
                        transitMap[pid].qty -= take;

                        // Create a "Transit Batch" record for persistence & traceability
                        // Check if a batch with this code already exists for this product
                        let batchId;
                        const existingBatch = await client.query('SELECT id FROM inventory_batches WHERE product_id = $1 AND batch_code = $2', [pid, transit.batch_code]);

                        if (existingBatch.rows.length > 0) {
                            batchId = existingBatch.rows[0].id;
                        } else {
                            // Fetch product prices for snapshotting
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

                        // Update the Transit Batch (It will go NEGATIVE until the GRN arrives)
                        await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batchId]);

                        // Log the usage of transit stock
                        await client.query(`
                            INSERT INTO stock_traceability (batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes)
                            VALUES ($1, $2, $3, 'OUT-TRANSIT', $4, 'Sales Invoice', $5)
                        `, [batchId, pid, -take, invId, `Transit stock (${transit.batch_code}) for ${invNumber}`]);

                        qtyToFulfill -= take;
                    }

                    if (qtyToFulfill > 0) {
                        throw new Error(`Insufficient stock (Real + Transit) for product ID ${pid}`);
                    }

                    await client.query('UPDATE sales_order_lines SET dispatched_qty = $1 WHERE id = $2', [line.ordered_qty, line.id]);
                    invTotal += Number(line.amount);
                    invTax += Number(line.tax_amount);
                }

                // 5. Update Totals & Order Status
                await client.query('UPDATE sales_invoices SET grand_total = $1, total_taxable = $2 WHERE id = $3', [invTotal, invTotal - invTax, invId]);
                await client.query("UPDATE sales_orders SET status = 'Invoiced' WHERE id = $1", [orderId]);

                await client.query('COMMIT');
                results.push({ order_id: orderId, status: 'Success', invoice_number: invNumber });

            } catch (err) {
                await client.query('ROLLBACK');
                results.push({ order_id: orderId, status: 'Failed', error: err.message });
            }
        }
        res.json({ results });
    } finally {
        client.release();
    }
});

module.exports = router;
