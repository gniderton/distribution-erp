const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. List Other Income
router.get('/', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let query = `
            SELECT 
                oi.transaction_date,
                ie.name as source_name,
                coa.name as category,
                ba.bank_name as received_in,
                oi.amount as total_amount,
                oi.id,
                oi.*
            FROM other_income oi
            JOIN chart_of_accounts coa ON oi.category_account_id = coa.id
            JOIN bank_accounts ba ON oi.destination_account_id = ba.id
            LEFT JOIN income_entities ie ON oi.entity_id = ie.id
            WHERE oi.is_active = true
        `;
        const params = [];
        if (start_date) {
            params.push(start_date);
            query += ` AND oi.transaction_date >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            query += ` AND oi.transaction_date <= $${params.length}`;
        }
        query += ` ORDER BY oi.transaction_date DESC, oi.id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('List Other Income Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Income Categories (Non-Operating)
router.get('/categories', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, code, name FROM chart_of_accounts 
            WHERE type = 'INCOME' 
            AND code BETWEEN 4100 AND 4199
            AND is_active = true 
            ORDER BY name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Record Other Income
router.post('/', async (req, res) => {
    const {
        transaction_date,
        category_account_id,
        destination_account_id,
        amount,
        taxable_amount,
        tax_amount,
        is_gst_income,
        gst_no,
        received_from,
        reference_no,
        description,
        payment_mode,
        cheque_no,
        cheque_date: chq_date,
        bank_name,
        bank_id,
        bank_statement_entry_id,
        user_id
    } = req.body;

    const client = await pool.connect();
    try {
        let resolvedDestinationId = destination_account_id;

        // 🚀 SMART AUTO-RESOLUTION: Derive destination account from statement entry if provided
        if (payment_mode !== 'Cheque' && bank_statement_entry_id) {
            const bRes = await client.query('SELECT bank_account_id FROM bank_statement_entries WHERE id = $1', [bank_statement_entry_id]);
            if (bRes.rows.length === 0) {
                return res.status(400).json({ error: `Bank statement entry ID ${bank_statement_entry_id} not found` });
            }
            resolvedDestinationId = bRes.rows[0].bank_account_id;
            console.log(`[Smart Other Income] Resolved destination_account_id from ${destination_account_id} to ${resolvedDestinationId} via statement entry`);
        }

        await client.query('BEGIN');

        // 1. Handle Sequence
        const seqRes = await client.query(`
            UPDATE document_sequences 
            SET current_number = current_number + 1 
            WHERE document_type = 'OTHER_INCOME' 
            RETURNING prefix, current_number
        `);
        if (seqRes.rows.length === 0) throw new Error("Income sequence not found");
        const { prefix, current_number } = seqRes.rows[0];
        const incomeNumber = `${prefix}${current_number.toString().padStart(5, '0')}`;

        // 2. Get Account Codes
        // Destination (Bank/Cash/Cheque)
        let drAccountCode = 1002; // Default Bank
        let isCash = false;

        if (payment_mode === 'Cheque') {
            drAccountCode = 1004; // Cheques in Hand
        } else {
            if (!resolvedDestinationId) throw new Error("Destination Account is required for Cash/Online payments");
            const destRes = await client.query('SELECT bank_name FROM bank_accounts WHERE id = $1', [resolvedDestinationId]);
            if (destRes.rows.length === 0) throw new Error("Invalid Destination Account");
            isCash = destRes.rows[0].bank_name.toLowerCase().includes('cash');
            drAccountCode = isCash ? 1003 : 1002;
        }

        // Income Category
        const catRes = await client.query('SELECT code, name FROM chart_of_accounts WHERE id = $1', [category_account_id]);
        if (catRes.rows.length === 0) throw new Error("Invalid Income Category");
        const crAccountCode = catRes.rows[0].code;

        // 3. Prepare Journal Lines
        const journalLines = [];
        const isCheque = payment_mode === 'Cheque';
        const effectiveBankAccountId = isCheque ? null : resolvedDestinationId;

        if (is_gst_income && Number(tax_amount) > 0) {
            // DR Bank/Cash/Cheque (Asset) - Received Grand Total
            journalLines.push({ code: drAccountCode, debit: Number(amount), credit: 0, bank_account_id: effectiveBankAccountId });

            // CR Income (Revenue) - Only Taxable Amount
            journalLines.push({ code: crAccountCode, debit: 0, credit: Number(taxable_amount) });

            // CR GST Output (Liability) - Tax
            const halfTax = Number(tax_amount) / 2;
            journalLines.push({ code: 2011, debit: 0, credit: halfTax }); // CGST Output
            journalLines.push({ code: 2012, debit: 0, credit: halfTax }); // SGST Output
        } else {
            // Simple Income
            journalLines.push({ code: drAccountCode, debit: Number(amount), credit: 0, bank_account_id: effectiveBankAccountId });
            journalLines.push({ code: crAccountCode, debit: 0, credit: Number(amount) });
        }

        // 4. Create Journal Entry
        const jeRes = await client.query(
            "SELECT create_journal_entry($1, $2, 'OTHER_INCOME', NULL, $3) as je_id",
            [transaction_date || new Date(), description || `Other Income: ${catRes.rows[0].name}`, JSON.stringify(journalLines)]
        );
        const journalEntryId = jeRes.rows[0].je_id;

        // 5. Save Record
        const insertRes = await client.query(`
            INSERT INTO other_income (
                income_number, transaction_date, category_account_id, 
                destination_account_id, amount, taxable_amount, tax_amount, 
                is_gst_income, gst_no, entity_id, reference_no, 
                description, created_by, journal_entry_id, bank_statement_entry_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id
        `, [
            incomeNumber, transaction_date || new Date(), category_account_id,
            resolvedDestinationId, amount, taxable_amount || amount, tax_amount || 0,
            is_gst_income || false, gst_no, received_from, /* Reused received_from variable for ID */
            reference_no, description, user_id, journalEntryId, bank_statement_entry_id
        ]);
        const incomeId = insertRes.rows[0].id;

        // 6. Update JE with Reference ID
        await client.query("UPDATE journal_entries SET reference_id = $1 WHERE id = $2", [incomeId, journalEntryId]);

        // 7. Handle Cheque Entry
        if (payment_mode === 'Cheque') {
            await client.query(`
                INSERT INTO cheques (
                    cheque_number, cheque_date, bank_id, bank_name, amount, type,
                    party_type, party_id, reference_type, reference_id, status
                ) VALUES ($1, $2, $3, $4, $5, 'INCOMING', 'INCOME_ENTITY', $6, 'OTHER_INCOME', $7, 'PENDING')
            `, [
                cheque_no, 
                chq_date || transaction_date || new Date(), 
                (bank_id === 'undefined' || !bank_id) ? null : bank_id,
                bank_name || 'N/A', 
                amount, 
                received_from, /* party_id */
                incomeId
            ]);
        }

        // 8. Handle Bank Statement Consumption (Online Mode)
        if (payment_mode && payment_mode.toUpperCase() === 'ONLINE' && bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (credit_amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [amount, bank_statement_entry_id]);
        }

        await client.query('COMMIT');
        res.json({ success: true, income_id: incomeId, income_number: incomeNumber });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('--- OTHER INCOME ERROR ---');
        console.error('Message:', err.message);
        console.error('Code:', err.code);
        res.status(500).json({
            error: 'Server Error recording income',
            details: err.message,
            code: err.code
        });
    } finally {
        client.release();
    }
});

// 4. Delete (Deactivate) Other Income
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Fetch record to get linked IDs
        const recordRes = await client.query(`
            SELECT journal_entry_id, bank_statement_entry_id, amount, is_active 
            FROM other_income WHERE id = $1
        `, [id]);

        if (recordRes.rows.length === 0) throw new Error("Other Income record not found");
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
                        WHEN (credit_amount - (GREATEST(0, COALESCE(consumed_amount, 0) - $1))) >= credit_amount - 0.01 THEN 'Available'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [record.amount, record.bank_statement_entry_id]);
        }

        // 3. Soft Deactivate and Nullify Reference (to avoid FK violation during JE deletion)
        await client.query("UPDATE other_income SET is_active = false, journal_entry_id = NULL WHERE id = $1", [id]);

        // 4. Delete Journal Entry (triggers bank balance reversal via DB trigger)
        if (record.journal_entry_id) {
            await client.query("DELETE FROM journal_entries WHERE id = $1", [record.journal_entry_id]);
        }

        // 5. Cancel Related Cheques (if applicable)
        await client.query(`
            UPDATE cheques SET status = 'CANCELLED' 
            WHERE reference_type = 'OTHER_INCOME' AND reference_id = $1
        `, [id]);

        await client.query('COMMIT');
        res.json({ success: true, message: "Other Income record and accounting effects reversed successfully" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Delete Other Income Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
