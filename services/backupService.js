const { pool } = require('../config/db');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

// Ensure backups folder exists
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * Sends the backup file via Email
 */
async function sendBackupEmail(filepath, filename) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const receivers = process.env.BACKUP_RECEIVERS || "gnidertonlimited@gmail.com, anfal.gniderton@gmail.com";

    if (!user || !pass) {
        console.warn("[Backup Email] Skipping Email: SMTP_USER or SMTP_PASS not configured in .env");
        return;
    }

    console.log(`[Backup Email] Preparing to send ${filename} to ${receivers}...`);

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });

    try {
        await transporter.sendMail({
            from: `"ERP Backup System" <${user}>`,
            to: receivers,
            subject: `📊 Nightly Database Backup: ${filename}`,
            text: `Attached is the universal database backup generated on ${new Date().toLocaleString()}.\n\nNote: This is an automated system message.`,
            attachments: [
                {
                    filename: filename,
                    path: filepath
                }
            ]
        });
        console.log(`[Backup Email] Success! Email sent to ${receivers}`);
    } catch (err) {
        console.error("[Backup Email] Failed to send email:", err.message);
    }
}

/**
 * Performs a universal backup by querying all tables to JSON
 */
async function performBackup(shouldEmail = true) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `universal-backup-${timestamp}.json`;
        const filepath = path.join(backupDir, filename);

        console.log(`[Universal Backup] Starting export to ${filename}...`);

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

        for (const table of tables) {
            const dataRes = await pool.query(`SELECT * FROM public."${table}"`);
            fullBackup.data[table] = dataRes.rows;
        }

        fs.writeFileSync(filepath, JSON.stringify(fullBackup, null, 2));
        console.log(`[Universal Backup] Success! Saved ${tables.length} tables to ${filename}`);

        // Trigger Email if requested
        if (shouldEmail) {
            await sendBackupEmail(filepath, filename);
        }

        return { filename, filepath, stats: { tables: tables.length } };
    } catch (err) {
        console.error(`[Universal Backup] Critical Error: ${err.message}`);
        throw err;
    }
}

/**
 * Nightly Cron Job (2:00 AM)
 */
function scheduleNightlyBackup() {
    console.log("[Backup Scheduler] Initializing Daily 2:00 AM Cron Job...");
    
    // Pattern: 0 2 * * * (Minute 0, Hour 2, every day)
    cron.schedule('0 2 * * *', async () => {
        console.log("[Backup Scheduler] Running Nightly Backup Task...");
        try {
            await performBackup(true); // Perform and Email
        } catch (e) {
            console.error("[Backup Scheduler] Fail:", e.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata" // Matches your local timezone
    });
}

module.exports = { performBackup, scheduleNightlyBackup };
