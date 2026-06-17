const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const kdkService = require('../services/kdkEwayBillService');

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
        const tripRes = await client.query("SELECT * FROM trips WHERE id = $1", [tripId]);
        if (tripRes.rows.length === 0) return res.status(404).json({ error: "Trip not found" });
        const trip = tripRes.rows[0];

        // 3. Get all invoices in this trip that are above the threshold and don't already have an EWB
        const invoicesRes = await client.query(`
            SELECT id, invoice_number, grand_total 
            FROM sales_invoices 
            WHERE id IN (SELECT invoice_id FROM trip_invoices WHERE trip_id = $1)
              AND grand_total >= $2
              AND eway_bill_number IS NULL
        `, [tripId, threshold]);

        const results = [];
        for (const inv of invoicesRes.rows) {
            try {
                // Generate Payload
                const payload = await kdkService.mapInvoiceToKDK(inv.id, trip.vehicle_number);
                
                // Call GSP API
                const ewbResponse = await kdkService.generateEWB(payload);

                if (ewbResponse.success) {
                    // Save to DB
                    await client.query(`
                        UPDATE sales_invoices 
                        SET eway_bill_number = $1, 
                            eway_bill_date = $2, 
                            eway_bill_valid_until = $3,
                            eway_bill_json = $4
                        WHERE id = $5
                    `, [ewbResponse.ewayBillNo, ewbResponse.ewayBillDate, ewbResponse.validUpto, JSON.stringify(ewbResponse), inv.id]);
                    
                    results.push({ id: inv.id, invoice: inv.invoice_number, status: 'Success', ewb: ewbResponse.ewayBillNo });
                } else {
                    results.push({ id: inv.id, invoice: inv.invoice_number, status: 'Failed', error: ewbResponse.error });
                }
            } catch (err) {
                results.push({ id: inv.id, invoice: inv.invoice_number, status: 'Error', error: err.message });
            }
        }

        await client.query('COMMIT');
        res.json({ 
            success: true, 
            thresholdUsed: threshold,
            processedCount: results.length,
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
