const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. List Other Income
router.get('/', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let query = `
            SELECT 
                oi.*, 
                coa.name as category_name,
                ba.bank_name as destination_account_name
            FROM other_income oi
            JOIN chart_of_accounts coa ON oi.category_account_id = coa.id
            JOIN bank_accounts ba ON oi.destination_account_id = ba.id
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
        received_from,
        reference_no,
        description,
        user_id
    } = req.body;

    const client = await pool.connect();
    try {
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
        // Destination (Bank/Cash)
        const destRes = await client.query('SELECT bank_name FROM bank_accounts WHERE id = $1', [destination_account_id]);
        if (destRes.rows.length === 0) throw new Error("Invalid Destination Account");
        const isCash = destRes.rows[0].bank_name.toLowerCase().includes('cash');
        const drAccountCode = isCash ? 1003 : 1002;

        // Income Category
        const catRes = await client.query('SELECT code, name FROM chart_of_accounts WHERE id = $1', [category_account_id]);
        if (catRes.rows.length === 0) throw new Error("Invalid Income Category");
        const crAccountCode = catRes.rows[0].code;

        // 3. Prepare Journal Lines
        const journalLines = [];
        if (is_gst_income && Number(tax_amount) > 0) {
            // DR Bank/Cash (Asset) - Received Grand Total
            journalLines.push({ code: drAccountCode, debit: Number(amount), credit: 0, bank_account_id: destination_account_id });

            // CR Income (Revenue) - Only Taxable Amount
            journalLines.push({ code: crAccountCode, debit: 0, credit: Number(taxable_amount) });

            // CR GST Output (Liability) - Tax
            const halfTax = Number(tax_amount) / 2;
            journalLines.push({ code: 2011, debit: 0, credit: halfTax }); // CGST Output
            journalLines.push({ code: 2012, debit: 0, credit: halfTax }); // SGST Output
        } else {
            // Simple Income
            journalLines.push({ code: drAccountCode, debit: Number(amount), credit: 0, bank_account_id: destination_account_id });
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
                is_gst_income, gst_no, received_from, reference_no, 
                description, created_by, journal_entry_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
        `, [
            incomeNumber, transaction_date || new Date(), category_account_id,
            destination_account_id, amount, taxable_amount || amount, tax_amount || 0,
            is_gst_income || false, gst_no, received_from,
            reference_no, description, user_id, journalEntryId
        ]);
        const incomeId = insertRes.rows[0].id;

        // 6. Update JE with Reference ID
        await client.query("UPDATE journal_entries SET reference_id = $1 WHERE id = $2", [incomeId, journalEntryId]);

        await client.query('COMMIT');
        res.json({ success: true, income_id: incomeId, income_number: incomeNumber });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Record Other Income Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
