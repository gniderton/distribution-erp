const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

/**
 * [WEBHOOK CORE] Handle Incoming SMS Alerts 
 * Centralized parsing for IDFC, Axis, and others.
 */
const handleSmsWebhook = async (req, res) => {
    try {
        const { content, from, timestamp } = req.body;
        const { token } = req.query;

        // --- SECURITY TOKEN CHECK ---
        // Prevents unauthorized POSTs to your endpoint
        if (token !== 'erp_secure_7624_sync') {
            console.warn(`[Bank Inbound] BLOCK: Unauthorized attempt with token: ${token}`);
            return res.status(401).json({ error: "Unauthorized: Invalid Security Token" });
        }

        if (!content) return res.status(400).json({ error: "Empty content" });

        console.log(`[Bank Inbound] Processing from ${from}: ${content.substring(0, 50)}...`);

        let bank_name = 'UNKNOWN';
        let amount = 0;
        let bank_ref_id = null;
        let isCredit = false;
        let last4 = null;

        // --- IDFC FIRST BANK PARSING ---
        if (/IDFC/i.test(from) || /IDFC/i.test(content)) {
            bank_name = 'IDFC FIRST BANK';
            
            // 1. Amount Calculation
            const amtMatch = content.match(/(?:credited|debited|received|Rs\.|INR)\s+(?:with|by|Rs\.?|INR)?\s?([\d,]+\.\d{2})/i) || 
                             content.match(/Rs\.\s?([\d,]+\.\d{2})/i);
            if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));

            // 2. Ref/UTR Calculation
            const refMatch = content.match(/Ref(?: No\.)?[:\s]+(\d+)/i) || 
                             content.match(/UTR\s?ID?([A-Z0-9]+)/i) ||
                             content.match(/IMPS Ref no\s?(\d+)/i) ||
                             content.match(/Chq No\.\s?(\d+)/i);
            if (refMatch) bank_ref_id = refMatch[1];

            // 3. Type Calculation
            isCredit = /credited|received/i.test(content) && !/returned/i.test(content);
            if (/returned/i.test(content)) isCredit = false;

            // 4. Account Matching
            const acctMatch = content.match(/A\/c X+?(\d{4,10})/i) || content.match(/ending X+(\d{4,10})/i);
            if (acctMatch) last4 = acctMatch[1];
        }

        // --- AXIS BANK PARSING ---
        else if (/AXIS/i.test(from) || /AXIS/i.test(content)) {
            bank_name = 'AXIS BANK';

            if (/Debit/i.test(content)) {
                const amtMatch = content.match(/Debit\s+(?:INR|Rs\.?)\s?([\d,]+\.\d{2})/i);
                if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));
                isCredit = false;
            } else if (/credited/i.test(content)) {
                const amtMatch = content.match(/(?:INR|Rs\.?)\s?([\d,]+\.\d{2})\s+credited/i);
                if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));
                isCredit = true;
            }

            const refMatch = content.match(/NEFT\/([A-Z0-9]+)\//i) || content.match(/Info-\s?([A-Z0-9\/-]+)/i);
            if (refMatch) bank_ref_id = refMatch[1];

            const acctMatch = content.match(/A\/c (?:no\.\s?)?X+(\d{4,10})/i);
            if (acctMatch) last4 = acctMatch[1];
        }

        // --- FINAL VALIDATION & DB INSERT ---
        if (!amount || !bank_ref_id) {
            return res.json({ success: false, message: "Could not parse amount or ref", bank: bank_name });
        }

        if (last4 && last4.length > 4) last4 = last4.substring(last4.length - 4);

        let bank_account_id = null;
        if (last4) {
            const acctQuery = await pool.query(
                "SELECT id FROM bank_accounts WHERE account_number LIKE '%' || $1 AND is_active = true LIMIT 1",
                [last4]
            );
            if (acctQuery.rows.length > 0) bank_account_id = acctQuery.rows[0].id;
        }

        if (!bank_account_id) {
            return res.json({ 
                success: false, 
                message: "Ignored: No matching company account found." 
            });
        }

        const result = await pool.query(`
            INSERT INTO bank_statement_entries 
            (transaction_date, bank_name, particulars, bank_ref_id, amount, credit_amount, debit_amount, status, bank_account_id)
            VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6, 'Alert-Pending', $7)
            ON CONFLICT (bank_account_id, bank_ref_id, amount, transaction_date) DO NOTHING
            RETURNING id
        `, [bank_name, content, bank_ref_id, amount, isCredit ? amount : 0, isCredit ? 0 : amount, bank_account_id]);

        if (result.rows.length === 0) {
            return res.json({ success: true, message: "Duplicate transaction ignored" });
        }

        res.json({ success: true, message: "Transaction added", id: result.rows[0].id, bank: bank_name, type: isCredit ? 'Credit' : 'Debit' });

    } catch (err) {
        console.error("[Bank Webhook] Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// --- REGISTER ROUTES ---
router.get('/', (req, res) => {
    res.json({ message: "Bank Inbound Service is Active", status: "Ready for SMS" });
});
router.post('/', handleSmsWebhook);
router.post('/webhook/sms-alerts', handleSmsWebhook);

module.exports = router;
