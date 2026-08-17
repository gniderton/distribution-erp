const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/sales-orders - List all orders with filters
router.get('/', async (req, res) => {
    try {
        const { start, end, dse, status } = req.query;

        let query = `
            SELECT 
                so.*,
                c.customer_name,
                c.address as customer_address,
                c.district,
                c.pin_code,
                c.gstin,
                c.phone as customer_phone,
                c.email as customer_email,
                c.route_id,
                r.route_name,
                e.full_name as dse_name,
                (
                    SELECT json_agg(json_build_object(
                        'product_id', sol.product_id,
                        'product_name', p.product_name,
                        'qty', sol.ordered_qty,
                        'rate', sol.rate,
                        'amount', sol.amount,
                        'tax_percent', sol.tax_percent,
                        'tax_amount', sol.tax_amount,
                        'mrp', p.mrp
                    ))
                    FROM sales_order_lines sol
                    JOIN products p ON sol.product_id = p.id
                    WHERE sol.sales_order_id = so.id
                ) as lines
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN routes r ON c.route_id = r.id
            LEFT JOIN employees e ON so.dse_id = e.id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (start && end) {
            query += ` AND so.order_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(start, end);
            paramIndex += 2;
        }

        if (dse) {
            query += ` AND so.dse_id = $${paramIndex}`;
            params.push(dse);
            paramIndex++;
        }

        if (status) {
            query += ` AND so.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY so.order_date DESC, so.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching sales orders:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/sales-orders/:id/lines - Get line items for an order
router.get('/:id/lines', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                sol.*,
                p.product_name,
                p.product_code
            FROM sales_order_lines sol
            JOIN products p ON sol.product_id = p.id
            WHERE sol.sales_order_id = $1
        `, [id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching order lines:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
