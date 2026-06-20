const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const nodemailer = require('nodemailer');

// GET /api/letters - Fetch historical official letters list
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM official_letters ORDER BY date DESC, id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/letters/send - Save letter draft and dispatch official letterhead email
router.post('/send', async (req, res) => {
    const {
        recipient_name,
        recipient_address,
        subject,
        body, // HTML content from Appsmith Rich Text Editor
        signatory,
        signatory_designation,
        email_to,
        email_cc
    } = req.body;

    if (!recipient_name || !subject || !body || !signatory) {
        return res.status(400).json({ error: 'recipient_name, subject, body, and signatory are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Generate unique sequential letter code
        const seqRes = await client.query("SELECT nextval('official_letter_seq')");
        const nextVal = seqRes.rows[0].nextval;
        const currentYear = new Date().getFullYear();
        const letter_code = `GN-LET-${currentYear}-${String(nextVal).padStart(4, '0')}`;

        // 2. Format HTML letterhead template for email body
        const letterheadHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                        color: #0f172a;
                        line-height: 1.6;
                        margin: 0;
                        padding: 0;
                        background-color: #f1f5f9;
                    }
                    .letterhead-container {
                        max-width: 700px;
                        margin: 30px auto;
                        background: #ffffff;
                        padding: 40px;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e2e8f0;
                    }
                    .header {
                        border-bottom: 2px solid #3b82f6;
                        padding-bottom: 15px;
                        margin-bottom: 30px;
                    }
                    .header-logo-title {
                        font-size: 24px;
                        font-weight: bold;
                        color: #3b82f6;
                        margin: 0;
                        text-transform: uppercase;
                    }
                    .header-details {
                        font-size: 11px;
                        color: #64748b;
                        margin-top: 5px;
                        line-height: 1.4;
                    }
                    .meta-info {
                        display: flex;
                        justify-content: space-between;
                        font-size: 13px;
                        color: #475569;
                        margin-bottom: 25px;
                    }
                    .recipient-section {
                        margin-bottom: 30px;
                        font-size: 14px;
                    }
                    .subject-line {
                        font-weight: bold;
                        font-size: 15px;
                        margin-bottom: 25px;
                        color: #0f172a;
                    }
                    .letter-body {
                        font-size: 14px;
                        color: #1e293b;
                        margin-bottom: 40px;
                    }
                    .signature-section {
                        font-size: 14px;
                        margin-top: 40px;
                        border-top: 1px solid #f1f5f9;
                        padding-top: 20px;
                    }
                    .footer {
                        margin-top: 50px;
                        border-top: 1px solid #e2e8f0;
                        padding-top: 15px;
                        font-size: 10px;
                        color: #94a3b8;
                        text-align: center;
                        line-height: 1.5;
                    }
                </style>
            </head>
            <body>
                <div class="letterhead-container">
                    <!-- Letterhead Header -->
                    <div class="header">
                        <div class="header-logo-title">Gniderton Private Limited</div>
                        <div class="header-details">
                            Regd. Office: 456 Business Square, Suite 800, Tech Park, Bangalore - 560001<br>
                            Tel: +91 80 4567 8901 | Email: official@gniderton.com | GSTIN: 29ABCDE1234F1Z1
                        </div>
                    </div>

                    <!-- Meta details -->
                    <table style="width:100%; font-size:13px; color:#475569; margin-bottom:25px;">
                        <tr>
                            <td><strong>Ref:</strong> ${letter_code}</td>
                            <td style="text-align:right;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                        </tr>
                    </table>

                    <!-- Recipient -->
                    <div class="recipient-section">
                        <strong>To,</strong><br>
                        ${recipient_name}<br>
                        ${recipient_address ? recipient_address.replace(/\n/g, '<br>') : ''}
                    </div>

                    <!-- Subject -->
                    <div class="subject-line">
                        Sub: ${subject}
                    </div>

                    <!-- Letter Body -->
                    <div class="letter-body">
                        ${body}
                    </div>

                    <!-- Signature -->
                    <div class="signature-section">
                        Yours Sincerely,<br><br><br>
                        <strong>${signatory}</strong><br>
                        ${signatory_designation || ''}<br>
                        Gniderton Private Limited
                    </div>

                    <!-- Letterhead Footer -->
                    <div class="footer">
                        Bank Details: Axis Bank Ltd | A/c No: 912345678901234 | IFSC: UTIB0000001<br>
                        CIN: U74140KA2026PTC123456 | Confidentiality Notice: This document contains official corporate communication.
                    </div>
                </div>
            </body>
            </html>
        `;

        // 3. Setup Nodemailer Transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 465,
            secure: process.env.SMTP_SECURE !== 'false',
            auth: {
                user: process.env.SMTP_USER || 'official.gniderton@gmail.com',
                pass: process.env.SMTP_PASS || 'mockpassword' // Replace with actual credentials in .env if available
            }
        });

        let is_sent = false;
        let sent_at = null;

        // 4. Send Email if recipient email is provided
        if (email_to) {
            try {
                const mailOptions = {
                    from: `"Gniderton Official" <${process.env.SMTP_USER || 'official.gniderton@gmail.com'}>`,
                    to: email_to,
                    cc: email_cc || undefined,
                    subject: `Official Letter: ${subject} (Ref: ${letter_code})`,
                    html: letterheadHtml
                };

                await transporter.sendMail(mailOptions);
                console.log(`✉️ Email successfully dispatched to ${email_to} for ${letter_code}`);
                is_sent = true;
                sent_at = new Date();
            } catch (mailErr) {
                console.warn(`⚠️ SMTP Mail dispatch failed: ${mailErr.message}. Logging letter to DB anyway.`);
            }
        }

        // 5. Save Letter Log to PostgreSQL Database
        const dbRes = await client.query(
            `INSERT INTO official_letters (
                letter_code, recipient_name, recipient_address, subject, body,
                signatory, signatory_designation, email_to, email_cc, is_sent, sent_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                letter_code,
                recipient_name,
                recipient_address || null,
                subject,
                body,
                signatory,
                signatory_designation || null,
                email_to || null,
                email_cc || null,
                is_sent,
                sent_at
            ]
        );

        await client.query('COMMIT');
        res.json({
            success: true,
            letter_code,
            is_sent,
            sent_at,
            letter: dbRes.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
