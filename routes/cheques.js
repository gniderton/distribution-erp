const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. List All Cheques (Management Dashboard)
router.get('/', async (req, res) => {
    try {
        const { status, type, party_type, start_date, end_date } = req.query;
        let query = `
            SELECT ch.*, 
                CASE 
                    WHEN party_type = 'CUSTOMER' THEN (SELECT customer_name FROM customers WHERE id = party_id)
                    WHEN party_type = 'VENDOR' THEN (SELECT vendor_name FROM vendors WHERE id = party_id)
                    ELSE party_type
                END as party_name
            FROM cheques ch
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }
        if (type) {
            params.push(type);
            query += ` AND type = $${params.length}`;
        }
        if (party_type) {
            params.push(party_type);
            query += ` AND party_type = $${params.length}`;
        }
        if (start_date) {
            params.push(start_date);
            query += ` AND cheque_date >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            query += ` AND cheque_date <= $${params.length}`;
        }

        query += ` ORDER BY cheque_date ASC, created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Mark Cheque as Cleared
router.post('/:id/clear', async (req, res) => {
    const { id } = req.params;
    const { clearance_date, bank_account_id, user_id, remarks } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Cheque Info
        const chqRes = await client.query('SELECT * FROM cheques WHERE id = $1 AND status = \'PENDING\'', [id]);
        if (chqRes.rows.length === 0) throw new Error('Cheque not found or already processed');
        const chq = chqRes.rows[0];

        if (!bank_account_id) throw new Error('Bank Account is required for clearing');

        // 2. Update status
        await client.query(`
            UPDATE cheques 
            SET status = 'CLEARED', 
                clearance_date = $1, 
                bank_account_id = $2, 
                remarks = $3,
                updated_at = NOW()
            WHERE id = $4
        `, [clearance_date || new Date(), bank_account_id, remarks, id]);

        // 3. Post Accounting Entry
        // Clearing Account -> Bank Account
        const acc_bank = 1002;
        const acc_cheque_in_hand = 1004;
        const acc_cheque_issued = 2004;

        let ledgerLines = [];
        if (chq.type === 'INCOMING') {
            // Received Cheque Cleared: Dr Bank (Asset increases), Cr Cheques in Hand (Asset decreases)
            ledgerLines = [
                { code: acc_bank, debit: Number(chq.amount), credit: 0, bank_account_id: bank_account_id },
                { code: acc_cheque_in_hand, debit: 0, credit: Number(chq.amount) }
            ];
        } else {
            // Issued Cheque Cleared: Dr Cheques Issued (Liability decreases), Cr Bank (Asset decreases)
            ledgerLines = [
                { code: acc_cheque_issued, debit: Number(chq.amount), credit: 0 },
                { code: acc_bank, debit: 0, credit: Number(chq.amount), bank_account_id: bank_account_id }
            ];
        }

        await client.query('SELECT create_journal_entry($1, $2, \'CHQ_CLEAR\', $3, $4)', [
            clearance_date || new Date(),
            `Cheque Cleared: ${chq.cheque_number} (${chq.bank_name})`,
            id,
            JSON.stringify(ledgerLines)
        ]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Cheque marked as Cleared' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 2b. Bulk Mark Cheques as Cleared
router.post('/bulk-clear', async (req, res) => {
    const { cheque_ids, clearance_date, bank_account_id, user_id, remarks } = req.body;

    if (!cheque_ids || !Array.isArray(cheque_ids) || cheque_ids.length === 0) {
        return res.status(400).json({ error: 'No cheque IDs provided' });
    }
    if (!bank_account_id) {
        return res.status(400).json({ error: 'Bank Account is required for clearing' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const id of cheque_ids) {
            // 1. Get Cheque Info
            const chqRes = await client.query('SELECT * FROM cheques WHERE id = $1 AND status = \'PENDING\'', [id]);
            if (chqRes.rows.length === 0) continue; // Skip already processed or non-existent
            const chq = chqRes.rows[0];

            // 2. Update status
            await client.query(`
                UPDATE cheques 
                SET status = 'CLEARED', 
                    clearance_date = $1, 
                    bank_account_id = $2, 
                    remarks = $3,
                    updated_at = NOW()
                WHERE id = $4
            `, [clearance_date || new Date(), bank_account_id, remarks, id]);

            // 3. Post Accounting Entry
            const acc_bank = 1002;
            const acc_cheque_in_hand = 1004;
            const acc_cheque_issued = 2004;

            let ledgerLines = [];
            if (chq.type === 'INCOMING') {
                ledgerLines = [
                    { code: acc_bank, debit: Number(chq.amount), credit: 0, bank_account_id: bank_account_id },
                    { code: acc_cheque_in_hand, debit: 0, credit: Number(chq.amount) }
                ];
            } else {
                ledgerLines = [
                    { code: acc_cheque_issued, debit: Number(chq.amount), credit: 0 },
                    { code: acc_bank, debit: 0, credit: Number(chq.amount), bank_account_id: bank_account_id }
                ];
            }

            await client.query('SELECT create_journal_entry($1, $2, \'CHQ_CLEAR\', $3, $4)', [
                clearance_date || new Date(),
                `Bulk Cheque Cleared: ${chq.cheque_number} (${chq.bank_name})`,
                id,
                JSON.stringify(ledgerLines)
            ]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Successfully cleared ${cheque_ids.length} cheques` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 3. Mark Cheque as Bounced
router.post('/:id/bounce', async (req, res) => {
    const { id } = req.params;
    const { bounce_date, bounce_reason, bank_charges, customer_penalty, user_id } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Cheque Info
        const chqRes = await client.query('SELECT * FROM cheques WHERE id = $1 AND status = \'PENDING\'', [id]);
        if (chqRes.rows.length === 0) throw new Error('Cheque not found or already processed');
        const chq = chqRes.rows[0];

        // 2. Update status and reason
        await client.query(`
            UPDATE cheques 
            SET status = 'BOUNCED', 
                remarks = $1,
                updated_at = NOW()
            WHERE id = $2
        `, [bounce_reason, id]);

        const acc_ar = 1101;
        const acc_ap = 2001;
        const acc_bank = 1002;
        const acc_cheque_in_hand = 1004;
        const acc_cheque_issued = 2004;
        const acc_bank_charges = 5005;
        const acc_misc_income = 4103;

        // 3. Reversal Entry
        let reversalLines = [];
        if (chq.type === 'INCOMING') {
            reversalLines = [
                { code: acc_ar, debit: Number(chq.amount), credit: 0 },
                { code: acc_cheque_in_hand, debit: 0, credit: Number(chq.amount) }
            ];
        } else {
            reversalLines = [
                { code: acc_cheque_issued, debit: Number(chq.amount), credit: 0 },
                { code: acc_ap, debit: 0, credit: Number(chq.amount) }
            ];
        }

        await client.query('SELECT create_journal_entry($1, $2, \'CHQ_BOUNCE_REV\', $3, $4)', [
            bounce_date || new Date(),
            `Bounce Reversal: ${chq.cheque_number} - ${bounce_reason}`,
            id,
            JSON.stringify(reversalLines)
        ]);

        // 4. Record Bank Charges (Expense)
        if (Number(bank_charges) > 0) {
            // Dr Bank Charges (5005), Cr Bank (1002)
            const chargeLines = [
                { code: acc_bank_charges, debit: Number(bank_charges), credit: 0 },
                { code: acc_bank, debit: 0, credit: Number(bank_charges), bank_account_id: chq.bank_account_id }
            ];
            await client.query('SELECT create_journal_entry($1, $2, \'CHQ_BOUNCE_FEE\', $3, $4)', [
                bounce_date || new Date(),
                `Bank Charges (Bounce): ${chq.cheque_number}`,
                id,
                JSON.stringify(chargeLines)
            ]);
        }

        // 5. Customer Penalty (Debit Note)
        if (chq.type === 'INCOMING' && Number(customer_penalty) > 0 && chq.party_id) {
            // 5a. Generate Penalty Invoice / Debit Note Number
            const yy = new Date().getFullYear().toString().slice(-2);
            const seqRes = await client.query("UPDATE document_sequences SET current_number = current_number + 1 WHERE document_type = 'DEBIT_NOTE' RETURNING prefix, current_number");

            let penaltyDocNo = `PEN-${yy}-${Date.now().toString().slice(-4)}`;
            if (seqRes.rows.length > 0) {
                penaltyDocNo = `${seqRes.rows[0].prefix}${seqRes.rows[0].current_number.toString().padStart(5, '0')}`;
            }

            // 5b. Create Record in sales_invoices (marking as Debit Note / Penalty)
            await client.query(`
                INSERT INTO sales_invoices (
                    invoice_number, customer_id, invoice_date, grand_total, amount_paid, 
                    status, description, created_by
                ) VALUES ($1, $2, $3, $4, 0, 'Unpaid', $5, $6)
            `, [
                penaltyDocNo, chq.party_id, bounce_date || new Date(), customer_penalty,
                `Cheque Bounce Penalty: ${chq.cheque_number} - ${bounce_reason}`, user_id
            ]);

            // 5c. GL Entry for Penalty: Dr AR (1101), Cr Misc Income (4103)
            const penaltyLines = [
                { code: acc_ar, debit: Number(customer_penalty), credit: 0 },
                { code: acc_misc_income, debit: 0, credit: Number(customer_penalty) }
            ];
            await client.query('SELECT create_journal_entry($1, $2, \'CHQ_BOUNCE_PENALTY\', $3, $4)', [
                bounce_date || new Date(),
                `Customer Penalty: ${chq.cheque_number}`,
                id,
                JSON.stringify(penaltyLines)
            ]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Cheque marked as Bounced and all penalties processed' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Bounce Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
