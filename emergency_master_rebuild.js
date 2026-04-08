const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

/**
 * TOTAL EMERGENCY RECONSTRUCTION
 * Merges Universal JSON Backup + Master SQL Schema to rebuild the 100+ account production state.
 */
async function reconstructMasterData() {
    try {
        console.log("--- STARTING 100% MASTER RECONSTRUCTION ---");

        // 1. LOAD UNIVERSAL JSON (March 25)
        const jsonPath = 'backups/universal-backup-2026-03-25T05-34-32-581Z.json';
        const backupObj = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const jsonAccounts = backupObj.data.chart_of_accounts || [];
        const jsonSequences = backupObj.data.document_sequences || [];

        console.log(`Loaded ${jsonAccounts.length} accounts and ${jsonSequences.length} sequences from JSON.`);

        // 2. PARSE MASTER SQL SCHEMA
        const sqlPath = 'master_schema.sql';
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Regex to extract (code, name, type) or (id, code, name, type, is_active)
        const coaMatches = sqlContent.matchAll(/INSERT INTO chart_of_accounts.*?\((.*?)\);/gs);
        const sqlAccounts = [];
        for (const match of coaMatches) {
            const rawRows = match[1].split('),');
            for (const row of rawRows) {
                // Heuristic parsing: extract code (integer), name (string in quotes), type (string in quotes)
                const parts = row.match(/\(?\s*(\d+),\s*'(.*?)',\s*'(.*?)'/);
                if (parts) {
                    sqlAccounts.push({ code: parseInt(parts[1]), name: parts[2], type: parts[3] });
                }
            }
        }
        console.log(`Parsed ${sqlAccounts.length} additional accounts from SQL schema.`);

        // 3. MERGE & CLEAN
        const finalAccounts = new Map();
        [...jsonAccounts, ...sqlAccounts].forEach(acc => {
            if (!finalAccounts.has(acc.code)) finalAccounts.set(acc.code, acc);
        });

        console.log(`Final de-duplicated count: ${finalAccounts.size} accounts.`);

        // 4. TRUNCATE & REBUILD
        console.log("Truncating to rebuild Master State...");
        await pool.query("TRUNCATE chart_of_accounts, document_sequences RESTART IDENTITY CASCADE");

        // 5. INJECT ACCOUNTS
        for (const [code, acc] of finalAccounts) {
            await pool.query(
                "INSERT INTO chart_of_accounts (code, name, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
                [acc.code, acc.name, acc.type]
            );
        }

        // 6. INJECT SEQUENCES (from JSON + SQL defaults)
        for (const seq of jsonSequences) {
            await pool.query(
                "INSERT INTO document_sequences (document_type, prefix, current_number) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
                [seq.document_type || seq.Document_Type, seq.prefix, seq.current_number]
            );
        }

        console.log("--- RECONSTRUCTION SUCCESSFUL ---");
        const countRes = await pool.query("SELECT count(*) FROM chart_of_accounts");
        console.log(`Verification: ${countRes.rows[0].count} accounts online.`);

    } catch (err) {
        console.error("Critical Reconstruction failure:", err);
    } finally {
        await pool.end();
    }
}

reconstructMasterData();
