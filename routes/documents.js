const express = require('express');
const router = express.Router();
const carbone = require('carbone');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');

/**
 * GET /api/documents/next/:docType
 * Returns the next available number for a document type without incrementing it.
 * Useful for UI display.
 */
router.get('/next/:docType', async (req, res) => {
    try {
        const { docType } = req.params;
        const result = await pool.query(`
            SELECT prefix, current_number 
            FROM document_sequences 
            WHERE document_type = $1 AND is_active = true
            LIMIT 1
        `, [docType]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: `Sequence for ${docType} not found` });
        }

        const { prefix, current_number } = result.rows[0];
        const nextNumber = Number(current_number) + 1;
        const formatted = `${prefix}${nextNumber}`;

        res.json({ 
            prefix, 
            current_number: Number(current_number), 
            next_number: nextNumber, 
            formatted 
        });
    } catch (err) {
        console.error('Fetch Next Number Error:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

/**
 * GET /api/documents/all-sequences
 * Returns all active document sequences formatted for the UI.
 */
router.get('/all-sequences', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT document_type, prefix, current_number 
            FROM document_sequences 
            WHERE is_active = true
            ORDER BY document_type ASC
        `);

        const formattedResult = result.rows.map(row => {
            const current = Number(row.current_number);
            const next = current + 1;
            return {
                document_type: row.document_type,
                prefix: row.prefix,
                current_number: current,
                next_number: next,
                formatted: `${row.prefix}${next}`
            };
        });

        res.json(formattedResult);
    } catch (err) {
        console.error('Fetch All Sequences Error:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

/**
 * POST /api/documents/increment/:docType
 * Increments the document sequence and returns the new value.
 */
router.post('/increment/:docType', async (req, res) => {
    try {
        const { docType } = req.params;
        const result = await pool.query(`
            UPDATE document_sequences 
            SET current_number = current_number + 1
            WHERE document_type = $1 AND is_active = true
            RETURNING prefix, current_number
        `, [docType]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: `Sequence for ${docType} not found` });
        }

        const { prefix, current_number } = result.rows[0];
        const formatted = `${prefix}${current_number}`;

        res.json({ 
            prefix, 
            current_number: Number(current_number), 
            formatted 
        });
    } catch (err) {
        console.error('Increment Sequence Error:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

/**
 * POST /api/documents/generate-pdf
 * Merges data with an Excel template and returns a PDF.
 * Body: { template: "po.xlsx", data: { ... } }
 */
router.post('/generate-pdf', (req, res) => {
    const { template, data } = req.body;

    if (!template || !data) {
        return res.status(400).json({ error: 'Missing template name or data' });
    }

    const templatePath = path.join(__dirname, '../templates', template);

    if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ error: `Template ${template} not found` });
    }

    const options = {
        convertTo: 'pdf'
    };

    carbone.render(templatePath, data, options, (err, result) => {
        if (err) {
            console.error('Carbone Error:', err);
            return res.status(500).json({ error: 'Failed to generate PDF', details: err.message });
        }

        // Set name of the download file
        const fileName = template.replace('.xlsx', '.pdf');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(result);
    });
});

module.exports = router;
