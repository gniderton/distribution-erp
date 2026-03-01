const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   POST /api/finance/transfers
// @desc    Record an internal transfer between accounts (Cash to Bank, Bank to Bank, Bank to Cash)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            from_account_id,
            to_account_id,
            amount,
            transfer_date,
            payment_mode,
            reference_no,
            remarks,
            from_bank_statement_entry_id, // Linked debit entry (for Bank to Bank/Cash)
            to_bank_statement_entry_id,   // Linked credit entry (for Cash/Bank to Bank)
            denominations                // Cash denominations JSON
        } = req.body;

        if (from_account_id === to_account_id) {
            return res.status(400).json({ error: 'Source and Destination accounts cannot be the same' });
        }

        await client.query('BEGIN');

        // 1. Get Accounts Info
        const fromAccRes = await client.query('SELECT bank_name FROM bank_accounts WHERE id = $1', [from_account_id]);
        const toAccRes = await client.query('SELECT bank_name FROM bank_accounts WHERE id = $1', [to_account_id]);

        if (fromAccRes.rows.length === 0 || toAccRes.rows.length === 0) {
            throw new Error('One or both accounts not found');
        }

        const fromAcc = fromAccRes.rows[0];
        const toAcc = toAccRes.rows[0];

        // 2. Determine COA Codes (1002 for Bank, 1003 for Cash)
        const acc_bank = 1002;
        const acc_cash = 1003;

        const fromCode = fromAcc.bank_name.toLowerCase().includes('cash') ? acc_cash : acc_bank;
        const toCode = toAcc.bank_name.toLowerCase().includes('cash') ? acc_cash : acc_bank;

        // 3. Create Journal Entry
        // Debit To-Account, Credit From-Account
        const ledgerLines = [
            { code: toCode, debit: Number(amount), credit: 0, bank_account_id: to_account_id },
            { code: fromCode, debit: 0, credit: Number(amount), bank_account_id: from_account_id }
        ];

        const description = `Internal Transfer (${payment_mode}): ${fromAcc.bank_name} -> ${toAcc.bank_name}${reference_no ? ' (Ref: ' + reference_no + ')' : ''}`;

        const journalRes = await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`,
            [transfer_date, description, 'TRANSFER', null, JSON.stringify(ledgerLines)]);

        const journalId = journalRes.rows[0].create_journal_entry;

        // 4. Record in internal_transfers table
        const transferRes = await client.query(`
            INSERT INTO internal_transfers (
                transfer_date, from_account_id, to_account_id, amount, 
                payment_mode, reference_no, remarks, journal_entry_id,
                from_bank_statement_entry_id, to_bank_statement_entry_id, denominations
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `, [
            transfer_date, from_account_id, to_account_id, amount,
            payment_mode, reference_no, remarks, journalId,
            from_bank_statement_entry_id, to_bank_statement_entry_id,
            denominations ? JSON.stringify(denominations) : null
        ]);

        const transferId = transferRes.rows[0].id;

        // 5. Update Bank Statement Entries (Reconciliation)
        // From side (Debit entry in bank statement = money going out)
        if (from_bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (debit_amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [amount, from_bank_statement_entry_id]);
        }

        // To side (Credit entry in bank statement = money coming in)
        if (to_bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (credit_amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [amount, to_bank_statement_entry_id]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, transfer_id: transferId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Transfer Error:', err.message);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   GET /api/finance/transfers
// @desc    Get transfer history
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                it.*,
                fa.bank_name as from_account_name,
                ta.bank_name as to_account_name
            FROM internal_transfers it
            JOIN bank_accounts fa ON it.from_account_id = fa.id
            JOIN bank_accounts ta ON it.to_account_id = ta.id
            ORDER BY it.transfer_date DESC, it.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
