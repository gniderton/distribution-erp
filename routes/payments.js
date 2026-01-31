const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/payments - List Payments (Filtered)
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0, route_id, date, days, status } = req.query;

        let query = `
            SELECT cp.*, c.customer_name
            FROM customer_payments cp
            JOIN customers c ON cp.customer_id = c.id
        `;
        const params = [];
        const where = [];
        let pIdx = 1;

        if (status) { where.push(`cp.status = $${pIdx}`); params.push(status); pIdx++; }
        if (route_id) { where.push(`c.route_id = $${pIdx}`); params.push(route_id); pIdx++; }
        if (date) { where.push(`cp.payment_date = $${pIdx}`); params.push(date); pIdx++; }
        if (days) { where.push(`cp.created_at >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'`); }

        if (where.length > 0) query += ` WHERE ${where.join(' AND ')}`;

        query += ` ORDER BY cp.created_at DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payments/ledger/:customerId
router.get('/ledger/:customerId', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM view_customer_ledger WHERE customer_id = $1 ORDER BY id DESC LIMIT 50",
            [req.params.customerId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payments/invoices/:customerId (For selection)
router.get('/invoices/:customerId', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT *, (grand_total - COALESCE(amount_paid, 0)) as balance 
            FROM sales_invoices 
            WHERE customer_id = $1 AND status != 'Paid'
            ORDER BY invoice_date ASC
        `, [req.params.customerId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/payments - Hybrid FIFO Allocation
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            customer_id, amount, payment_mode,
            transaction_ref, collected_by, payment_date,
            invoices, // [NEW] Optional: Array of Invoice IDs to prioritize
            location_lat, location_lng
        } = req.body;

        const totalPaid = Number(amount);
        if (totalPaid <= 0) return res.status(400).json({ error: 'Invalid amount' });

        await client.query('BEGIN');

        // 1. Generate Payment Number (PAY-YY-SEQ)
        const yy = new Date().getFullYear().toString().slice(-2);
        const seqRes = await client.query("SELECT COUNT(*) FROM customer_payments WHERE payment_number LIKE $1", [`PAY-${yy}-%`]);
        let nextSeq = parseInt(seqRes.rows[0].count) + 1;
        let payNumber;
        let check;
        do {
            payNumber = `PAY-${yy}-${String(nextSeq).padStart(4, '0')}`;
            check = await client.query("SELECT id FROM customer_payments WHERE payment_number = $1", [payNumber]);
            if (check.rows.length > 0) nextSeq++;
        } while (check.rows.length > 0);

        // 2. Create Payment Record (Unallocated)
        const payRes = await client.query(`
            INSERT INTO customer_payments (
                payment_number, customer_id, amount, payment_mode, 
                transaction_ref, collected_by, payment_date, status,
                location_lat, location_lng
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Verified', $8, $9)
            RETURNING id
        `, [
            payNumber, customer_id, totalPaid, payment_mode,
            transaction_ref, collected_by, payment_date || new Date(),
            location_lat, location_lng
        ]);
        const paymentId = payRes.rows[0].id;

        let remainingToAllocate = totalPaid;
        const allocations = [];

        // 3. PHASE 1: Selected Invoices (Priority)
        if (invoices && Array.isArray(invoices) && invoices.length > 0) {
            // Fetch only selected invoices
            const selectedRes = await client.query(`
                SELECT id, invoice_number, grand_total, COALESCE(amount_paid, 0) as amount_paid 
                FROM sales_invoices 
                WHERE id = ANY($1::int[]) AND status != 'Paid'
                ORDER BY invoice_date ASC
            `, [invoices]);

            for (const inv of selectedRes.rows) {
                if (remainingToAllocate <= 0) break;

                const balance = Number(inv.grand_total) - Number(inv.amount_paid);
                if (balance <= 0) continue;

                const allocate = Math.min(remainingToAllocate, balance);

                allocations.push({ invoice_id: inv.id, amount: allocate });
                remainingToAllocate -= allocate;
            }
        }

        // 4. PHASE 2: FIFO Overflow (Oldest Unpaid First)
        if (remainingToAllocate > 0) {
            // Fetch ALL unpaid invoices for customer, ordered by date
            const unpaidRes = await client.query(`
                SELECT id, invoice_number, grand_total, COALESCE(amount_paid, 0) as amount_paid 
                FROM sales_invoices 
                WHERE customer_id = $1 AND status != 'Paid'
                ORDER BY invoice_date ASC
            `, [customer_id]);

            for (const inv of unpaidRes.rows) {
                if (remainingToAllocate <= 0) break;

                // Check if we effectively paid this in Phase 1?
                // We allocated in JS array, DB not updated yet. 
                // Need to account for Phase 1 allocation to avoid double counting.
                const existingAlloc = allocations.find(a => a.invoice_id === inv.id);
                const alreadyAllocated = existingAlloc ? existingAlloc.amount : 0;

                const balance = (Number(inv.grand_total) - Number(inv.amount_paid)) - alreadyAllocated;

                if (balance <= 0) continue;

                const allocate = Math.min(remainingToAllocate, balance);

                if (existingAlloc) {
                    existingAlloc.amount += allocate;
                } else {
                    allocations.push({ invoice_id: inv.id, amount: allocate });
                }

                remainingToAllocate -= allocate;
            }
        }

        // 5. Commit Allocations to DB
        for (const alloc of allocations) {
            // A. Create Allocation Record
            await client.query(`
                INSERT INTO payment_allocations (payment_id, invoice_id, amount)
                VALUES ($1, $2, $3)
            `, [paymentId, alloc.invoice_id, alloc.amount]);

            // B. Update Invoice Balance
            await client.query(`
                UPDATE sales_invoices 
                SET amount_paid = COALESCE(amount_paid, 0) + $1,
                    status = CASE 
                        WHEN (grand_total - (COALESCE(amount_paid, 0) + $1)) <= 1 THEN 'Paid' -- Tolerance
                        ELSE 'Partial' 
                    END
                WHERE id = $2
            `, [alloc.amount, alloc.invoice_id]);
        }

        // 6. If money STILL remains (Overpayment), it sits in 'customer_payments' 
        // linked to customer, but not allocated to any invoice.
        // The Ledger View will show this as a Credit.

        // --- ACCOUNTING INTEGRATION ---
        const acc_ar = 1101;
        const acc_bank = 1002;
        const acc_cash = 1003;

        const targetAcc = (payment_mode === 'Cash') ? acc_cash : acc_bank;

        const roundedPaid = Number(totalPaid.toFixed(2));
        const ledgerLines = [
            { code: targetAcc, debit: roundedPaid, credit: 0 },
            { code: acc_ar, debit: 0, credit: roundedPaid }
        ];

        await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
            [payment_date || new Date(), `Customer Payment: ${payNumber}`, 'CUST_PAY', paymentId, JSON.stringify(ledgerLines)]);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            id: paymentId,
            payment_number: payNumber,
            allocated_count: allocations.length,
            unallocated_balance: remainingToAllocate
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Payment Error:", err);
        res.status(500).json({ error: err.stack || err.message });
    } finally {
        client.release();
    }
});

// Admin endpoints (Verify/Reject) ... (Keep existing verify logic if needed, but 'Verified' implies auto-post here)
// For simplicity, DSE payments are auto-verified in this Phase.

module.exports = router;
