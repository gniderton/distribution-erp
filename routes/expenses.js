const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. List Expenses
router.get('/', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let query = `
            SELECT 
                ex.expense_date,
                ee.name as vendor_name,
                coa.name as category,
                ba.bank_name as paid_via,
                ex.grand_total,
                ex.id,
                ex.*
            FROM expenses ex
            JOIN chart_of_accounts coa ON ex.category_account_id = coa.id
            JOIN bank_accounts ba ON ex.payment_source_id = ba.id
            LEFT JOIN expense_entities ee ON ex.entity_id = ee.id
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
        payment_mode,
        cheque_no,
        cheque_date: chq_date,
        bank_id,
        bank_name: chq_bank_name,
        bank_statement_entry_id,
        asset_id,
        user_id
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Handle Retool sending strings like "undefined" or "null"
        const cleanID = (val) => (val === 'undefined' || val === 'null' || val === '' || val === undefined) ? null : val;
        const pSourceId = cleanID(payment_source_id);
        const pCatId = cleanID(category_account_id);
        const cleanStmtId = cleanID(bank_statement_entry_id);
        const cleanAssetId = cleanID(asset_id);

        let resolvedPaymentSourceId = pSourceId;

        // 🚀 SMART AUTO-RESOLUTION: Derive payment source account from statement entry if provided
        if (payment_mode !== 'Cheque' && cleanStmtId) {
            const bRes = await client.query('SELECT bank_account_id FROM bank_statement_entries WHERE id = $1', [cleanStmtId]);
            if (bRes.rows.length === 0) {
                return res.status(400).json({ error: `Bank statement entry ID ${bank_statement_entry_id} not found` });
            }
            resolvedPaymentSourceId = bRes.rows[0].bank_account_id;
            console.log(`[Smart Expense] Resolved payment_source_id from ${pSourceId} to ${resolvedPaymentSourceId} via statement entry`);
        }

        if (payment_mode !== 'Cheque' && !resolvedPaymentSourceId) throw new Error("payment_source_id is missing");
        if (!pCatId) throw new Error("category_account_id is missing");

        // Use sequential expense number
        const seqRes = await client.query(`
            UPDATE document_sequences 
            SET current_number = current_number + 1 
            WHERE document_type = 'EXPENSE' 
            RETURNING prefix, current_number
        `);
        if (seqRes.rows.length === 0) throw new Error("Expense sequence not found");
        const { prefix, current_number } = seqRes.rows[0];
        const expenseNumber = `${prefix}${current_number.toString().padStart(5, '0')}`;

        // 1. Get Source Account ID (Cash/Bank/Cheque)
        let paymentCOAId = 2004; // Defaults to Cheques Issued if Cheque
        
        // Map Bank Account IDs to Chart of Account Codes
        // Assuming ID 1 is Bank, ID 2 is Cash, ID 3+ are other Banks
        const coa_map = { 1: 1002, 2: 1003, 3: 1002, 4: 1002, 5: 1002 }; 
 
        if (payment_mode !== 'Cheque') {
            let sourceRes;
            if (!isNaN(resolvedPaymentSourceId)) {
                sourceRes = await client.query('SELECT id FROM bank_accounts WHERE id = $1', [resolvedPaymentSourceId]);
            } else {
                sourceRes = await client.query('SELECT id FROM bank_accounts WHERE bank_name = $1', [resolvedPaymentSourceId]);
            }
            if (sourceRes.rows.length === 0) throw new Error(`Invalid Payment Source: "${resolvedPaymentSourceId}"`);
            resolvedPaymentSourceId = sourceRes.rows[0].id;
            paymentCOAId = coa_map[resolvedPaymentSourceId] || 1003; // Fallback to Cash if unknown
        }

        // 2. Get Expense Category Detail
        const catRes = await client.query('SELECT code, name FROM chart_of_accounts WHERE id = $1', [pCatId]);
        if (catRes.rows.length === 0) throw new Error(`Invalid Category ID: ${pCatId}`);
        const categoryCode = catRes.rows[0].code;

        // 3. Prepare Journal Lines
        const journalLines = [];
        if (is_gst_expense && Number(tax_amount) > 0) {
            journalLines.push({ code: categoryCode, debit: Number(taxable_amount), credit: 0 });
            const halfTax = Number(tax_amount) / 2;
            journalLines.push({ code: 1011, debit: halfTax, credit: 0 });
            journalLines.push({ code: 1012, debit: halfTax, credit: 0 });
            journalLines.push({ code: paymentCOAId, debit: 0, credit: Number(grand_total), bank_account_id: payment_mode === 'Cheque' ? null : resolvedPaymentSourceId });
        } else {
            journalLines.push({ code: categoryCode, debit: Number(grand_total), credit: 0 });
            journalLines.push({ code: paymentCOAId, debit: 0, credit: Number(grand_total), bank_account_id: payment_mode === 'Cheque' ? null : resolvedPaymentSourceId });
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
                entity_id, bill_no, gst_no, description, reference_no,
                created_by, journal_entry_id, expense_number, bank_statement_entry_id, asset_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id
        `, [
            expense_date || new Date(), pCatId, resolvedPaymentSourceId,
            taxable_amount, tax_amount, grand_total, is_gst_expense,
            vendor_name, bill_no, gst_no, description, reference_no,
            user_id, journalEntryId, expenseNumber, cleanStmtId, cleanAssetId
        ]);
        const expenseId = expenseRes.rows[0].id;

        // 6. Update Journal Entry with Expense Reference ID
        await client.query(
            "UPDATE journal_entries SET reference_id = $1 WHERE id = $2",
            [expenseId, journalEntryId]
        );

        // 7. Handle Cheque Entry
        if (payment_mode === 'Cheque') {
            await client.query(`
                INSERT INTO cheques (
                    cheque_number, cheque_date, bank_id, bank_name, amount, 
                    type, party_type, party_id, reference_type, reference_id, status
                ) VALUES ($1, $2, $3, $4, $5, 'OUTGOING', 'EXPENSE_ENTITY', $6, 'EXPENSE', $7, 'PENDING')
            `, [
                cheque_no || reference_no, 
                chq_date || expense_date || new Date(), 
                (bank_id === 'undefined' || !bank_id) ? null : bank_id,
                chq_bank_name || 'Own Bank', 
                grand_total, 
                vendor_name, /* Entity ID */
                expenseId
            ]);
        }

        // 8. Handle Bank Statement Consumption (Online Mode)
        if (payment_mode && payment_mode.toUpperCase() === 'ONLINE' && cleanStmtId) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (debit_amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [grand_total, cleanStmtId]);
        }

        await client.query('COMMIT');
        res.json({ success: true, expense_id: expenseId, journal_entry_id: journalEntryId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('--- EXPENSE RECORDING ERROR ---');
        console.error('Message:', err.message);
        console.error('Code:', err.code);
        res.status(500).json({
            error: 'Server Error recording expense',
            details: err.message,
            code: err.code
        });
    } finally {
        client.release();
    }
});

// 4. Delete (Deactivate) Expense
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Fetch record to get linked IDs
        const recordRes = await client.query(`
            SELECT journal_entry_id, bank_statement_entry_id, grand_total as amount, is_active 
            FROM expenses WHERE id = $1
        `, [id]);

        if (recordRes.rows.length === 0) throw new Error("Expense record not found");
        const record = recordRes.rows[0];

        if (!record.is_active) {
            return res.json({ success: true, message: "Record already deactivated" });
        }

        // 2. Reverse Bank Statement Consumption (if applicable)
        if (record.bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = GREATEST(0, COALESCE(consumed_amount, 0) - $1),
                    status = CASE 
                        WHEN (debit_amount - (GREATEST(0, COALESCE(consumed_amount, 0) - $1))) >= debit_amount - 0.01 THEN 'Available'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [record.amount, record.bank_statement_entry_id]);
        }

        // 3. Soft Deactivate and Nullify Reference (to avoid FK violation during JE deletion)
        await client.query("UPDATE expenses SET is_active = false, journal_entry_id = NULL WHERE id = $1", [id]);

        // 4. Delete Journal Entry (triggers bank balance reversal via DB trigger)
        if (record.journal_entry_id) {
            await client.query("DELETE FROM journal_entries WHERE id = $1", [record.journal_entry_id]);
        }

        // 5. Cancel Related Cheques (if applicable)
        await client.query(`
            UPDATE cheques SET status = 'CANCELLED' 
            WHERE reference_type = 'EXPENSE' AND reference_id = $1
        `, [id]);

        await client.query('COMMIT');
        res.json({ success: true, message: "Expense record and accounting effects reversed successfully" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Delete Expense Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
