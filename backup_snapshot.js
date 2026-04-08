const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function backup() {
    try {
        console.log("--- STARTING SAFETY SNAPSHOT ---");
        
        // 1. Snapshot the bank_statement_entries table
        const r = await pool.query('SELECT * FROM bank_statement_entries ORDER BY id');
        const data = JSON.stringify(r.rows, null, 2);
        
        const backupDir = path.join(__dirname, 'tmp');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
        
        const backupPath = path.join(backupDir, `bank_backup_snapshot_${Date.now()}.json`);
        fs.writeFileSync(backupPath, data);
        
        console.log(`SUCCESS: Snapshot saved to ${backupPath}`);
        console.log(`Total records backed up: ${r.rows.length}`);
        
    } catch (e) {
        console.error("Backup Failed:", e.message);
    } finally {
        pool.end();
    }
}

backup();
