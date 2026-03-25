const { pool } = require('../config/db');
const path = require('path');
const fs = require('fs');

// Ensure backups folder exists
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * Performs a universal backup by querying all tables to JSON
 */
async function performBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `universal-backup-${timestamp}.json`;
        const filepath = path.join(backupDir, filename);

        console.log(`[Universal Backup] Starting export to ${filename}...`);

        // 1. Get all public tables
        const tableRes = await pool.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
        `);
        
        const tables = tableRes.rows.map(r => r.tablename);
        const fullBackup = {
            metadata: {
                timestamp: new Date().toISOString(),
                table_count: tables.length,
                db: 'postgres (supabase)'
            },
            data: {}
        };

        // 2. Loop through and extract all data
        for (const table of tables) {
            console.log(`[Universal Backup] Exporting ${table}...`);
            const dataRes = await pool.query(`SELECT * FROM public."${table}"`);
            fullBackup.data[table] = dataRes.rows;
        }

        // 3. Write to file
        fs.writeFileSync(filepath, JSON.stringify(fullBackup, null, 2));
        
        console.log(`[Universal Backup] Success! Saved ${tables.length} tables to ${filename}`);
        return { filename, filepath, stats: { tables: tables.length } };
    } catch (err) {
        console.error(`[Universal Backup] Critical Error: ${err.message}`);
        throw err;
    }
}

/**
 * Basic native scheduler (2:00 AM)
 */
function scheduleNightlyBackup() {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(2, 0, 0, 0);

    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun - now;
    console.log(`[Backup Scheduler] Next run scheduled for ${nextRun.toLocaleString()}`);

    setTimeout(async () => {
        try {
            await performBackup();
        } catch (e) {
            console.error("[Backup Scheduler] Fail:", e.message);
        }
        scheduleNightlyBackup();
    }, delay);
}

module.exports = { performBackup, scheduleNightlyBackup };
