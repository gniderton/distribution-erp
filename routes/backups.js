const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { performBackup } = require('../services/backupService');

const backupDir = path.join(__dirname, '../backups');

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

/**
 * List all available backups
 */
router.get('/list', async (req, res) => {
    try {
        if (!fs.existsSync(backupDir)) return res.json([]);
        
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.json') || f.endsWith('.sql'))
            .map(f => {
                const stats = fs.statSync(path.join(backupDir, f));
                return {
                    name: f,
                    size: Math.round(stats.size / 1024) + " KB",
                    createdAt: stats.birthtime
                };
            })
            .sort((a, b) => b.createdAt - a.createdAt);
            
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Download a specific backup file
 */
router.get('/download/:filename', async (req, res) => {
    try {
        const filename = path.basename(req.params.filename); // Security: Prevent path traversal
        const filepath = path.join(backupDir, filename);
        
        if (!fs.existsSync(filepath)) {
            return res.status(404).send("Backup file not found on server.");
        }
        
        res.download(filepath, filename);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
