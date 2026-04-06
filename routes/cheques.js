const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. List All Cheques (Management Dashboard)
router.get('/', async (req, res) => {
    try {
        const { status, type, party_type, start_date, end_date } = req.query;
        let query = `
            SELECT 
                ch.id, ch.cheque_number, ch.cheque_date, ch.amount, ch.type, 
                ch.party_type, ch.party_id, ch.reference_type, ch.reference_id, 
                ch.status, ch.remarks, ch.clearance_date, ch.bank_account_id, 
                ch.bank_statement_entry_id, ch.created_at, ch.updated_at, ch.bank_id,
                COALESCE(mb.bank_name, ch.bank_name) as bank_name,
                CASE 
                    WHEN party_type = 'CUSTOMER' THEN (SELECT customer_name FROM customers WHERE id = party_id)
                    WHEN party_type = 'VENDOR' THEN (SELECT vendor_name FROM vendors WHERE id = party_id)
                    WHEN party_type = 'INCOME_ENTITY' THEN (SELECT name FROM income_entities WHERE id = party_id)
                    WHEN party_type = 'EXPENSE_ENTITY' THEN (SELECT name FROM expense_entities WHERE id = party_id)
                    ELSE party_type
                END as party_name
            FROM cheques ch
            LEFT JOIN master_banks mb ON ch.bank_id = mb.id
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
    const { clearance_date, bank_account_id, bank_statement_entry_id, user_id, remarks } = req.body;

    if (!bank_statement_entry_id) {
        return res.status(400).json({ error: 'Bank Statement Entry ID is mandatory for clearing' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Cheque Info
        const chqRes = await client.query('SELECT * FROM cheques WHERE id = $1 AND status = \'PENDING\'', [id]);
        if (chqRes.rows.length === 0) throw new Error('Cheque not found or already processed');
        const chq = chqRes.rows[0];

        if (!bank_account_id) throw new Error('Bank Account is required for clearing');

        // 2. Update status and link statement
        await client.query(`
            UPDATE cheques 
            SET status = 'CLEARED', 
                clearance_date = $1, 
                bank_account_id = $2, 
                bank_statement_entry_id = $3,
                remarks = $4,
                updated_at = NOW()
            WHERE id = $5
        `, [clearance_date || new Date(), bank_account_id, bank_statement_entry_id, remarks, id]);

        // 2b. Consume Bank Statement Entry
        await client.query(`
            UPDATE bank_statement_entries 
            SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                status = CASE 
                    WHEN (amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                    ELSE 'Partially Consumed'
                END
            WHERE id = $2
        `, [chq.amount, bank_statement_entry_id]);

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

// 2b. Bulk Mark Cheques as Cleared (with Individual Mappings)
router.post('/bulk-clear', async (req, res) => {
    const { mappings, clearance_date, bank_account_id, user_id, remarks } = req.body;

    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
        return res.status(400).json({ error: 'No mappings provided. Expected [{cheque_id, bank_statement_entry_id}, ...]' });
    }
    if (!bank_account_id) {
        return res.status(400).json({ error: 'Bank Account is required for clearing' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const mapping of mappings) {
            const { cheque_id, bank_statement_entry_id } = mapping;
            if (!cheque_id || !bank_statement_entry_id) continue;

            // 1. Get Cheque Info
            const chqRes = await client.query('SELECT * FROM cheques WHERE id = $1 AND status = \'PENDING\'', [cheque_id]);
            if (chqRes.rows.length === 0) continue;
            const chq = chqRes.rows[0];

            // 2. Update status and link statement
            await client.query(`
                UPDATE cheques 
                SET status = 'CLEARED', 
                    clearance_date = $1, 
                    bank_account_id = $2, 
                    bank_statement_entry_id = $3,
                    remarks = $4,
                    updated_at = NOW()
                WHERE id = $5
            `, [clearance_date || new Date(), bank_account_id, bank_statement_entry_id, remarks, cheque_id]);

            // 2b. Consume Bank Statement Entry
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [chq.amount, bank_statement_entry_id]);

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
                cheque_id,
                JSON.stringify(ledgerLines)
            ]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Successfully cleared ${mappings.length} cheques with statement linkage` });
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
    const { bounce_date, bounce_reason, bank_charges, customer_penalty, vendor_penalty, user_id } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Cheque Info
        const chqRes = await client.query('SELECT * FROM cheques WHERE id = $1 AND status = \'PENDING\'', [id]);
        if (chqRes.rows.length === 0) throw new Error('Cheque not found or already processed');
        const chq = chqRes.rows[0];

        // 2. Update status, reason, and specifically the bounce_date
        await client.query(`
            UPDATE cheques 
            SET status = 'BOUNCED', 
                remarks = $1,
                bounce_date = $2,
                updated_at = NOW()
            WHERE id = $3
        `, [bounce_reason, bounce_date || new Date(), id]);

        const acc_ar = 1101;
        const acc_ap = 2001;
        const acc_bank = 1002;
        const acc_cheque_in_hand = 1004;
        const acc_cheque_issued = 2004;
        const acc_bank_charges = 5202;
        const acc_misc_income = 4103;

        // 3. Reversal Entry
        let reversalLines = [];
        let reversalAccountCode = null;

        if (chq.type === 'INCOMING') {
            reversalAccountCode = acc_ar; // Default 1101

            if (chq.reference_type === 'OTHER_INCOME' && chq.reference_id) {
                const oiRes = await client.query(`
                    SELECT coa.code 
                    FROM other_income oi 
                    JOIN chart_of_accounts coa ON oi.category_account_id = coa.id 
                    WHERE oi.id = $1
                `, [chq.reference_id]);
                if (oiRes.rows.length > 0) reversalAccountCode = oiRes.rows[0].code;
            } else if (chq.reference_type === 'ASSET_SALE_PAYMENT') {
                reversalAccountCode = 1001; // Asset Receivable
            }

            reversalLines = [
                { code: reversalAccountCode, debit: Number(chq.amount), credit: 0 },
                { code: acc_cheque_in_hand, debit: 0, credit: Number(chq.amount) }
            ];
        } else {
            reversalAccountCode = acc_ap; // Default 2001

            if (chq.reference_type === 'EXPENSE' && chq.reference_id) {
                const exRes = await client.query(`
                    SELECT coa.code 
                    FROM expenses ex 
                    JOIN chart_of_accounts coa ON ex.category_account_id = coa.id 
                    WHERE ex.id = $1
                `, [chq.reference_id]);
                if (exRes.rows.length > 0) reversalAccountCode = exRes.rows[0].code;
            }

            reversalLines = [
                { code: acc_cheque_issued, debit: Number(chq.amount), credit: 0 },
                { code: reversalAccountCode, debit: 0, credit: Number(chq.amount) }
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

        // 5. Income Penalty (Customer or Income Entity)
        if (chq.type === 'INCOMING' && Number(customer_penalty) > 0 && chq.party_id) {
            if (chq.party_type === 'CUSTOMER') {
                // 5a. Generate Penalty Document Number
                const yy = new Date().getFullYear().toString().slice(-2);
                const seqRes = await client.query("UPDATE document_sequences SET current_number = current_number + 1 WHERE document_type = 'DEBIT_NOTE' RETURNING prefix, current_number");

                let penaltyDocNo = `PEN-${yy}-${Date.now().toString().slice(-4)}`;
                if (seqRes.rows.length > 0) {
                    penaltyDocNo = `${seqRes.rows[0].prefix}${seqRes.rows[0].current_number.toString().padStart(5, '0')}`;
                }

                // 5b. Create Sales Invoice (Debit Note)
                await client.query(`
                    INSERT INTO sales_invoices (
                        invoice_number, customer_id, invoice_date, grand_total, amount_paid, 
                        status, description, created_by
                    ) VALUES ($1, $2, $3, $4, 0, 'Unpaid', $5, $6)
                `, [
                    penaltyDocNo, chq.party_id, bounce_date || new Date(), customer_penalty,
                    `Cheque Bounce Penalty: ${chq.cheque_number} - ${bounce_reason}`, user_id
                ]);

                // 5c. GL Entry: Dr AR (1101), Cr Misc Income (4103)
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
            } else if (chq.party_type === 'INCOME_ENTITY') {
                const seqRes = await client.query("UPDATE document_sequences SET current_number = current_number + 1 WHERE document_type = 'INCOME_PENALTY' RETURNING prefix, current_number");
                const pNo = seqRes.rows[0] ? `${seqRes.rows[0].prefix}${seqRes.rows[0].current_number.toString().padStart(5, '0')}` : `IPEN-${Date.now()}`;

                await client.query(`
                    INSERT INTO income_penalties (entity_id, amount, penalty_date, penalty_number, cheque_id, remarks)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [chq.party_id, customer_penalty, bounce_date || new Date(), pNo, id, `Cheque Bounce: ${chq.cheque_number}`]);

                const penaltyLines = [
                    { code: acc_ar, debit: Number(customer_penalty), credit: 0 },
                    { code: acc_misc_income, debit: 0, credit: Number(customer_penalty) }
                ];
                await client.query('SELECT create_journal_entry($1, $2, \'CHQ_BOUNCE_PENALTY\', $3, $4)', [
                    bounce_date || new Date(),
                    `Income Penalty: ${chq.cheque_number}`,
                    id,
                    JSON.stringify(penaltyLines)
                ]);
            }
        }

        // 6. Vendor/Expense Penalty (if Outgoing)
        const penaltyToVendor = vendor_penalty || customer_penalty; 
        if (chq.type === 'OUTGOING' && Number(penaltyToVendor) > 0 && chq.party_id) {
            if (chq.party_type === 'VENDOR') {
                // 6a. Generate Vendor Penalty Number
                const seqRes = await client.query("UPDATE document_sequences SET current_number = current_number + 1 WHERE document_type = 'CREDIT_NOTE' RETURNING prefix, current_number");
                
                let vPenaltyNo = `VPEN-TMP-${Date.now()}`;
                if (seqRes.rows.length > 0) {
                    vPenaltyNo = `${seqRes.rows[0].prefix}${seqRes.rows[0].current_number.toString().padStart(5, '0')}`;
                }

                // 6b. Record in vendor_penalties table
                await client.query(`
                    INSERT INTO vendor_penalties (
                        vendor_id, amount, penalty_date, penalty_number, cheque_id, remarks
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    chq.party_id, penaltyToVendor, bounce_date || new Date(), vPenaltyNo, id,
                    `Cheque Bounce Penalty: ${chq.cheque_number} - ${bounce_reason}`
                ]);

                // 6c. GL Entry: Dr Bank Charges (5005), Cr Accounts Payable (2001)
                const vPenaltyLines = [
                    { code: acc_bank_charges, debit: Number(penaltyToVendor), credit: 0 },
                    { code: acc_ap, debit: 0, credit: Number(penaltyToVendor) }
                ];
                await client.query('SELECT create_journal_entry($1, $2, \'CHQ_BOUNCE_VPENALTY\', $3, $4)', [
                    bounce_date || new Date(),
                    `Vendor Bounce Penalty: ${chq.cheque_number}`,
                    id,
                    JSON.stringify(vPenaltyLines)
                ]);
            } else if (chq.party_type === 'EXPENSE_ENTITY') {
                const seqRes = await client.query("UPDATE document_sequences SET current_number = current_number + 1 WHERE document_type = 'EXPENSE_PENALTY' RETURNING prefix, current_number");
                const pNo = seqRes.rows[0] ? `${seqRes.rows[0].prefix}${seqRes.rows[0].current_number.toString().padStart(5, '0')}` : `EPEN-${Date.now()}`;

                await client.query(`
                    INSERT INTO expense_penalties (entity_id, amount, penalty_date, penalty_number, cheque_id, remarks)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [chq.party_id, penaltyToVendor, bounce_date || new Date(), pNo, id, `Cheque Bounce: ${chq.cheque_number}`]);

                const ePenaltyLines = [
                    { code: acc_bank_charges, debit: Number(penaltyToVendor), credit: 0 },
                    { code: acc_ap, debit: 0, credit: Number(penaltyToVendor) }
                ];
                await client.query('SELECT create_journal_entry($1, $2, \'CHQ_BOUNCE_EPENALTY\', $3, $4)', [
                    bounce_date || new Date(),
                    `Expense Bounce Penalty: ${chq.cheque_number}`,
                    id,
                    JSON.stringify(ePenaltyLines)
                ]);
            }
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
