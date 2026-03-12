const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/sales/unified - Unified view of orders and invoices
router.get('/unified', async (req, res) => {
    try {
        const {
            status,
            customer_id,
            route_id,
            dse_id,
            date_from,
            date_to,
            search // Search by SO number or invoice number
        } = req.query;

        let query = `
            SELECT 
                so.id,
                so.so_number,
                so.customer_id,
                c.customer_name,
                so.dse_id,
                e.full_name as dse_name,
                so.order_date,
                COALESCE((SELECT delivery_time::DATE FROM trip_invoices WHERE invoice_id = si.id AND delivery_time IS NOT NULL ORDER BY delivery_time DESC LIMIT 1), so.delivery_date) as delivery_date,
                so.status,
                so.total_amount as order_total,
                so.tax_amount as order_tax,
                so.remarks,
                so.latitude,
                so.longitude,
                
                -- Aggregated Invoice breakdown (from lines)
                (SELECT SUM(gross_amount) FROM sales_invoice_lines WHERE invoice_id = si.id) as invoice_gross_amount,
                (SELECT SUM(scheme_amount) FROM sales_invoice_lines WHERE invoice_id = si.id) as invoice_scheme_amount,
                (SELECT SUM(discount_amount) FROM sales_invoice_lines WHERE invoice_id = si.id) as invoice_discount_amount,
                si.total_taxable as invoice_taxable_amount,
                (si.total_cgst + si.total_sgst + si.total_igst) as invoice_gst_amount,
                si.grand_total as invoice_net_amount,
                
                -- Invoice details (null if not invoiced)
                si.id as invoice_id,
                si.invoice_number,
                si.invoice_date,
                si.grand_total,
                si.total_taxable,
                si.total_cgst,
                si.total_sgst,
                (si.total_cgst + si.total_sgst) as total_gst,
                si.status as invoice_status,
                si.delivery_status,
                
                -- Customer Geographics
                c.gstin,
                r.route_name as route,
                ca.address_line1 as customer_address,
                ca.city as district,
                ca.pincode as pin_code,

                -- Real-time Payment Calculations
                CASE WHEN si.id IS NOT NULL THEN
                    COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id), 0)
                ELSE 0 END as paid_amount,
                CASE WHEN si.id IS NOT NULL THEN
                    si.grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id), 0)
                ELSE 0 END as balance_amount,
                
                -- Computed fields for frontend
                CASE 
                    WHEN so.status = 'Invoiced' THEN si.invoice_number
                    ELSE so.so_number
                END as display_number,
                
                CASE 
                    WHEN so.status = 'Invoiced' THEN si.grand_total
                    ELSE so.total_amount
                END as display_amount,
                
                CASE 
                    WHEN so.status = 'Invoiced' THEN 'Invoice'
                    ELSE 'Order'
                END as document_type
                
            FROM sales_orders so
            LEFT JOIN sales_invoices si ON si.sales_order_id = so.id
            LEFT JOIN customers c ON c.id = so.customer_id
            LEFT JOIN routes r ON c.route_id = r.id
            LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_default_billing = true
            LEFT JOIN employees e ON e.id = so.dse_id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        // Filters
        if (status) {
            query += ` AND so.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (customer_id) {
            query += ` AND so.customer_id = $${paramCount}`;
            params.push(customer_id);
            paramCount++;
        }

        if (route_id) {
            query += ` AND c.route_id = $${paramCount}`;
            params.push(route_id);
            paramCount++;
        }

        if (dse_id) {
            query += ` AND so.dse_id = $${paramCount}`;
            params.push(dse_id);
            paramCount++;
        }

        if (date_from) {
            query += ` AND so.order_date >= $${paramCount}`;
            params.push(date_from);
            paramCount++;
        }

        if (date_to) {
            query += ` AND so.order_date <= $${paramCount}`;
            params.push(date_to);
            paramCount++;
        }

        if (search) {
            query += ` AND (so.so_number ILIKE $${paramCount} OR si.invoice_number ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        query += ` ORDER BY so.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (err) {
        console.error('Unified API Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/sales/unified/:id - Single order/invoice detail
router.get('/unified/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                so.*,
                so.id as order_id,
                c.customer_name,
                c.customer_phone,
                c.gstin,
                r.route_name as route,
                ca.address_line1 as customer_address,
                ca.city as district,
                ca.pincode as pin_code,
                e.full_name as dse_name,
                
                -- Invoice header
                si.id as invoice_id,
                si.invoice_number,
                si.invoice_date,
                si.grand_total,
                si.total_taxable,
                si.total_cgst,
                si.total_sgst,
                CASE WHEN si.id IS NOT NULL THEN
                    COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id), 0)
                ELSE 0 END as paid_amount,
                CASE WHEN si.id IS NOT NULL THEN
                    si.grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id), 0)
                ELSE 0 END as balance_amount,
                (SELECT SUM(gross_amount) FROM sales_invoice_lines WHERE invoice_id = si.id) as invoice_gross_amount,
                (SELECT SUM(scheme_amount) FROM sales_invoice_lines WHERE invoice_id = si.id) as invoice_scheme_amount,
                (SELECT SUM(discount_amount) FROM sales_invoice_lines WHERE invoice_id = si.id) as invoice_discount_amount,
                si.status as invoice_status,
                si.delivery_status,
                COALESCE((SELECT delivery_time::DATE FROM trip_invoices WHERE invoice_id = si.id AND delivery_time IS NOT NULL ORDER BY delivery_time DESC LIMIT 1), so.delivery_date) as actual_delivery_date,
                
                -- Order lines
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', sol.id,
                            'product_id', sol.product_id,
                            'product_name', p.product_name,
                            'ordered_qty', sol.ordered_qty,
                            'dispatched_qty', sol.dispatched_qty,
                            'cancelled_qty', sol.cancelled_qty,
                            'rate', sol.rate,
                            'discount_percent', sol.discount_percent,
                            'tax_percent', sol.tax_percent,
                            'amount', sol.amount,
                            'tier_applied', sol.tier_applied
                        )
                    )
                    FROM sales_order_lines sol
                    LEFT JOIN products p ON p.id = sol.product_id
                    WHERE sol.sales_order_id = so.id
                ) as order_lines,
                
                -- Invoice lines (if invoiced)
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', il.id,
                            's_no', il.s_no,
                            'product_id', il.product_id,
                            'product_name', p.product_name,
                            'product_code', p.product_code,
                            'ean_code', p.ean_code,
                            'hsn_code', h.hsn_code,
                            'category_name', cat.category_name,
                            'brand_name', b.brand_name,
                            'batch_code', ib.batch_code,
                            'expiry_date', ib.expiry_date,
                            'shipped_qty', il.shipped_qty,
                            'rate', il.rate,
                            'mrp', il.mrp,
                            'gross_amount', il.gross_amount,
                            'scheme_amount', il.scheme_amount,
                            'discount_percent', il.discount_percent,
                            'discount_amount', il.discount_amount,
                            'taxable_amount', il.taxable_amount,
                            'tax_percent', il.tax_percent,
                            'tax_amount', il.tax_amount,
                            'amount', il.amount
                        )
                    )
                    FROM (
                        SELECT *, row_number() OVER (ORDER BY id ASC) as s_no 
                        FROM sales_invoice_lines 
                        WHERE invoice_id = si.id
                    ) il
                    LEFT JOIN products p ON p.id = il.product_id
                    LEFT JOIN categories cat ON p.category_id = cat.id
                    LEFT JOIN brands b ON p.brand_id = b.id
                    LEFT JOIN hsn_codes h ON p.hsn_id = h.id
                    LEFT JOIN inventory_batches ib ON il.batch_id = ib.id
                ) as invoice_lines
                
            FROM sales_orders so
            LEFT JOIN sales_invoices si ON si.sales_order_id = so.id
            LEFT JOIN customers c ON c.id = so.customer_id
            LEFT JOIN routes r ON c.route_id = r.id
            LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_default_billing = true
            LEFT JOIN employees e ON e.id = so.dse_id
            WHERE so.id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error('Unified Detail API Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
