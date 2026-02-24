const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. List Credit Note Headers
router.get('/', async (req, res) => {
    try {
        const { start_date, end_date, customer_id, status } = req.query;
        let query = `
            SELECT 
                sr.id, 
                sr.return_number, 
                sr.return_date, 
                sr.type, 
                sr.grand_total, 
                sr.total_taxable, 
                sr.total_tax, 
                sr.status, 
                sr.remarks,
                c.customer_name,
                si.invoice_number as original_invoice_number,
                e.full_name as created_by_name
            FROM sales_returns sr
            JOIN customers c ON sr.customer_id = c.id
            LEFT JOIN sales_invoices si ON sr.invoice_id = si.id
            LEFT JOIN employees e ON sr.created_by = e.id
            WHERE sr.is_active = true
        `;
        const params = [];
        let paramCount = 1;

        if (start_date) {
            query += ` AND sr.return_date >= $${paramCount++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND sr.return_date <= $${paramCount++}`;
            params.push(end_date);
        }
        if (customer_id) {
            query += ` AND sr.customer_id = $${paramCount++}`;
            params.push(customer_id);
        }
        if (status) {
            query += ` AND sr.status = $${paramCount++}`;
            params.push(status);
        }

        query += ` ORDER BY sr.return_date DESC, sr.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('List Credit Notes Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Single Credit Note with Lines
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const headerRes = await pool.query(`
            SELECT 
                sr.*,
                c.customer_name,
                c.gstin as customer_gstin,
                si.invoice_number as original_invoice_number,
                e.full_name as created_by_name
            FROM sales_returns sr
            JOIN customers c ON sr.customer_id = c.id
            LEFT JOIN sales_invoices si ON sr.invoice_id = si.id
            LEFT JOIN employees e ON sr.created_by = e.id
            WHERE sr.id = $1
        `, [id]);

        if (headerRes.rows.length === 0) {
            return res.status(404).json({ error: "Credit Note not found" });
        }

        const linesRes = await pool.query(`
            SELECT 
                srl.*, 
                p.product_name,
                ib.batch_number
            FROM sales_return_lines srl
            JOIN products p ON srl.product_id = p.id
            LEFT JOIN inventory_batches ib ON srl.batch_id = ib.id
            WHERE srl.return_id = $1
            ORDER BY srl.id ASC
        `, [id]);

        res.json({
            ...headerRes.rows[0],
            lines: linesRes.rows
        });
    } catch (err) {
        console.error('Get Credit Note Detail Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
