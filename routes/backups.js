const express = require('express');
const router = express.Router();
const { performBackup } = require('../services/backupService');

/**
 * Trigger a manual backup from the frontend (Appsmith)
 */
router.post('/trigger', async (req, res) => {
    try {
        const result = await performBackup();
        res.json({ 
            success: true, 
            message: "Manual Backup Triggered Successfully", 
            filename: result.filename 
        });
    } catch (err) {
        console.error("[Backup Route] Error:", err.message);
        res.status(500).json({ 
            success: false, 
            error: "Backup failed: " + err.message 
        });
    }
});

module.exports = router;
