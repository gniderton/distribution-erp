const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const kdkService = require('../services/kdkEwayBillService');
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * [NEW] Bulk Generate E-Way Bills for a Trip
 * Logic:
 * 1. Fetch threshold from system_settings
 * 2. Find eligible invoices in the trip
 * 3. Generate EWB for each via KDK
 */
router.post('/bulk-trip/:tripId', async (req, res) => {
    const { tripId } = req.params;
    const { user_id } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get current threshold from settings
        const settingsRes = await client.query("SELECT setting_value FROM system_settings WHERE setting_key = 'eway_bill_threshold'");
        const threshold = parseFloat(settingsRes.rows[0]?.setting_value || 50000);

        // 2. Get Trip details (Vehicle No)
        const tripRes = await client.query("SELECT * FROM delivery_trips WHERE id = $1", [tripId]);
        if (tripRes.rows.length === 0) return res.status(404).json({ error: "Trip not found" });
        const trip = tripRes.rows[0];

        // 3. Get all invoices in this trip that are above the threshold and don't already have an EWB
        const invoicesRes = await client.query(`
            SELECT id, invoice_number, grand_total 
            FROM sales_invoices 
            WHERE id IN (SELECT invoice_id FROM trip_invoices WHERE trip_id = $1)
              AND CAST(grand_total AS NUMERIC) >= $2
              AND (eway_bill_number IS NULL OR eway_bill_number = '')
        `, [tripId, threshold]);

        const payloads = [];
        const results = [];
        for (const inv of invoicesRes.rows) {
            try {
                // Generate Payload
                const payload = await kdkService.mapInvoiceToKDK(inv.id, trip.vehicle_number);
                payloads.push(payload);
                results.push({ id: inv.id, invoice: inv.invoice_number, status: 'Success' });
            } catch (err) {
                results.push({ id: inv.id, invoice: inv.invoice_number, status: 'Error', error: err.message });
            }
        }

        await client.query('COMMIT');
        
        if (payloads.length === 0) {
            return res.json({ 
                success: true, 
                message: "No eligible invoices found to generate E-Way Bills.",
                details: results 
            });
        }
        
        // Structure the JSON for bulk upload as per NIC/GSP specs
        // Often wrapped in a "billLists" or similar array, but sending the raw array for now
        const bulkPayload = {
            version: "1.0.0621",
            billLists: payloads
        };

        res.json({ 
            success: true, 
            thresholdUsed: threshold,
            processedCount: payloads.length,
            fileData: bulkPayload,
            fileName: `Trip_${tripId}_EWB_${Date.now()}.json`,
            details: results 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Bulk EWB Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

/**
 * [NEW] Upload E-Way Bill Response (Excel/CSV from NIC Portal)
 */
router.post('/upload-response', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        let updatedCount = 0;
        let notFoundCount = 0;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            for (const row of rows) {
                // NIC portal typically has "Document No" and "E-Way Bill No" columns
                // Check various possible key names based on common formats
                const docNo = row['Document No'] || row['Document Number'] || row['Invoice No'] || row['docNo'];
                const ewbNo = row['E-Way Bill No'] || row['E Way Bill No'] || row['EWB No'] || row['ewayBillNo'];

                if (docNo && ewbNo) {
                    const updateRes = await client.query(`
                        UPDATE sales_invoices 
                        SET eway_bill_number = $1, eway_bill_date = NOW()
                        WHERE invoice_number = $2 AND eway_bill_number IS NULL
                        RETURNING id
                    `, [ewbNo, docNo]);
                    
                    if (updateRes.rowCount > 0) {
                        updatedCount++;
                    } else {
                        notFoundCount++;
                    }
                }
            }

            await client.query('COMMIT');
            res.json({ success: true, updatedCount, notFoundCount });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Error parsing EWB Upload:', err);
        res.status(500).json({ error: 'Failed to process file: ' + err.message });
    }
});

/**
 * [NEW] Get System Settings (for Appsmith UI)
 */
router.get('/settings', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM system_settings WHERE category = 'Taxation'");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * [NEW] Update Threshold
 */
router.put('/settings/threshold', async (req, res) => {
    const { value } = req.body;
    try {
        await pool.query("UPDATE system_settings SET setting_value = $1, updated_at = NOW() WHERE setting_key = 'eway_bill_threshold'", [value]);
        res.json({ success: true, newValue: value });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
