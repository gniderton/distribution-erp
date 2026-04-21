const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

/**
 * @route   GET /api/inventory/ledger/:productId
 * @desc    Get chronological stock movements for a specific product with running balance
 * @access  Private
 */
router.get('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { start_date, end_date } = req.query;

        if (!productId || isNaN(productId)) {
            return res.status(400).json({ error: 'Valid Product ID is required' });
        }

        // 1. Fetch Product Basic Info
        const prodRes = await pool.query('SELECT product_name, product_code FROM products WHERE id = $1', [productId]);
        if (prodRes.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = prodRes.rows[0];

        // 2. Fetch Opening Balance (Sum of movements before start_date)
        let openingBalance = 0;
        if (start_date) {
            const obRes = await pool.query(`
                SELECT COALESCE(SUM(quantity_change), 0) as opening_balance
                FROM stock_traceability
                WHERE product_id = $1 AND created_at < $2
            `, [productId, start_date]);
            openingBalance = Number(obRes.rows[0].opening_balance);
        }

        // 3. Fetch Movements within period
        let query = `
            SELECT 
                st.id,
                st.created_at as date,
                st.transaction_type,
                st.quantity_change,
                st.reference_id,
                st.reference_type,
                st.notes,
                ib.batch_code,
                -- Resolve Reference Number based on Type
                CASE 
                    WHEN st.reference_type = 'Sales Invoice' THEN (SELECT invoice_number FROM sales_invoices WHERE id = st.reference_id)
                    WHEN st.reference_type = 'Purchase Invoice' THEN (SELECT invoice_number FROM purchase_invoice_headers WHERE id = st.reference_id)
                    WHEN st.reference_type = 'Debit Note' THEN (SELECT debit_note_number FROM debit_notes WHERE id = st.reference_id)
                    WHEN st.reference_type = 'Return Slip' THEN (SELECT debit_note_number FROM debit_notes WHERE id = st.reference_id)
                    WHEN st.reference_type = 'Sales Return' THEN (SELECT return_number FROM sales_returns WHERE id = st.reference_id)
                    WHEN st.reference_type = 'Stock Adjustment' THEN 'ADJ-' || st.reference_id
                    ELSE st.reference_type || ' #' || st.reference_id
                END as reference_number
            FROM stock_traceability st
            LEFT JOIN inventory_batches ib ON st.batch_id = ib.id
            WHERE st.product_id = $1
        `;
        const params = [productId];

        if (start_date) {
            query += ` AND st.created_at >= $${params.length + 1}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND st.created_at <= $${params.length + 1}`;
            params.push(end_date);
        }

        query += ` ORDER BY st.created_at ASC, st.id ASC`;

        const movements = await pool.query(query, params);

        // 4. Calculate Running Balance
        let currentBalance = openingBalance;
        const ledger = movements.rows.map(m => {
            currentBalance += Number(m.quantity_change);
            return {
                ...m,
                running_balance: Number(currentBalance.toFixed(3))
            };
        });

        res.json({
            product_name: product.product_name,
            product_code: product.product_code,
            opening_balance: openingBalance,
            closing_balance: currentBalance,
            movements: ledger
        });

    } catch (err) {
        console.error('Inventory Ledger API Error:', err.message);
        res.status(500).json({ error: 'Server Error: ' + err.message });
    }
});

module.exports = router;
