const express = require('express');
const router = express.Router();
const carbone = require('carbone');
const path = require('path');
const fs = require('fs');

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
