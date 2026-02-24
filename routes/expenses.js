const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. List Expenses
router.get('/', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let query = `
            SELECT 
                ex.*, 
                coa.name as category_name,
                ba.bank_name as payment_source_name
            FROM expenses ex
            JOIN chart_of_accounts coa ON ex.category_account_id = coa.id
            JOIN bank_accounts ba ON ex.payment_source_id = ba.id
            WHERE ex.is_active = true
        `;
        const params = [];
        if (start_date) {
            params.push(start_date);
            query += ` AND ex.expense_date >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            query += ` AND ex.expense_date <= $${params.length}`;
        }
        query += ` ORDER BY ex.expense_date DESC, ex.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('List Expenses Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Expense Categories (for dropdown filtering by EXPENSE type)
router.get('/categories', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, code, name FROM chart_of_accounts 
            WHERE type = 'EXPENSE' AND is_active = true 
            ORDER BY name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2b. Get Payment Sources (Cash & Bank Accounts)
router.get('/payment-sources', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, bank_name, current_balance FROM bank_accounts 
            WHERE is_active = true 
            ORDER BY bank_name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Record New Expense
router.post('/', async (req, res) => {
    const {
        expense_date,
        category_account_id,
        payment_source_id,
        taxable_amount,
        tax_amount,
        grand_total,
        is_gst_expense,
        vendor_name,
        bill_no,
        gst_no,
        description,
        reference_no,
        user_id
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Source Account Code (Cash/Bank)
        const sourceRes = await client.query('SELECT bank_name FROM bank_accounts WHERE id = $1', [payment_source_id]);
        if (sourceRes.rows.length === 0) throw new Error("Invalid Payment Source");
        const isCash = sourceRes.rows[0].bank_name.toLowerCase().includes('cash');
        const paymentAccountCode = isCash ? 1003 : 1002;

        // 2. Get Expense Category Detail
        const catRes = await client.query('SELECT code, name FROM chart_of_accounts WHERE id = $1', [category_account_id]);
        const categoryCode = catRes.rows[0].code;

        // 3. Prepare Journal Lines
        const journalLines = [];
        if (is_gst_expense && Number(tax_amount) > 0) {
            // DR Expense (Taxable)
            journalLines.push({ code: categoryCode, debit: Number(taxable_amount), credit: 0 });
            // DR GST Input (Assuming SGST + CGST split 50/50 for simplicity, or just CGST/SGST total to one if needed)
            // For general India context, we use CGST (1011) and SGST (1012)
            const halfTax = Number(tax_amount) / 2;
            journalLines.push({ code: 1011, debit: halfTax, credit: 0 });
            journalLines.push({ code: 1012, debit: halfTax, credit: 0 });
            // CR Payment Account
            journalLines.push({ code: paymentAccountCode, debit: 0, credit: Number(grand_total) });
        } else {
            // Simple Expense
            journalLines.push({ code: categoryCode, debit: Number(grand_total), credit: 0 });
            journalLines.push({ code: paymentAccountCode, debit: 0, credit: Number(grand_total) });
        }

        // 4. Create Journal Entry using DB function
        const jeRes = await client.query(
            "SELECT create_journal_entry($1, $2, 'EXPENSE', NULL, $3) as je_id",
            [expense_date || new Date(), description || `Expense: ${catRes.rows[0].name}`, JSON.stringify(journalLines)]
        );
        const journalEntryId = jeRes.rows[0].je_id;

        // 5. Save Expense Record
        const expenseRes = await client.query(`
            INSERT INTO expenses (
                expense_date, category_account_id, payment_source_id, 
                taxable_amount, tax_amount, grand_total, is_gst_expense,
                vendor_name, bill_no, gst_no, description, reference_no,
                created_by, journal_entry_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
        `, [
            expense_date || new Date(), category_account_id, payment_source_id,
            taxable_amount, tax_amount, grand_total, is_gst_expense,
            vendor_name, bill_no, gst_no, description, reference_no,
            user_id, journalEntryId
        ]);
        const expenseId = expenseRes.rows[0].id;

        // 6. Update Journal Entry with Expense Reference ID
        await client.query(
            "UPDATE journal_entries SET reference_id = $1 WHERE id = $2",
            [expenseId, journalEntryId]
        );

        await client.query('COMMIT');
        res.json({ success: true, expense_id: expenseId, journal_entry_id: journalEntryId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Record Expense Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
