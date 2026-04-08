const { pool } = require('./config/db');
const fs = require('fs');

async function finalRecovery() {
    try {
        console.log("--- STARTING FINAL MARCH 25TH RECOVERY ---");

        // 1. DATA SOURCE
        const jsonPath = 'backups/universal-backup-2026-03-25T05-34-32-581Z.json';
        const backupObj = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const backupData = backupObj.data;

        // 2. TABLES TO RESTORE (SETUP ONLY)
        const setupTables = [
            'chart_of_accounts',
            'document_sequences',
            'taxes',
            'hsn_codes',
            'bank_accounts',
            'routes',
            'channels',
            'uom',
            'designations',
            'departments'
        ];

        // 3. CLEAN SLATE
        console.log("Clearing existing setup tables...");
        await pool.query(`TRUNCATE ${setupTables.filter(t => !t.endsWith('_seq')).join(', ')} RESTART IDENTITY CASCADE`);

        // 4. RESTORE FROM JSON
        for (const table of setupTables) {
            if (backupData[table] && backupData[table].length > 0) {
                console.log(`Restoring ${table} (${backupData[table].length} rows)...`);
                const rows = backupData[table];
                const cols = Object.keys(rows[0]);
                
                for (const row of rows) {
                    const values = cols.map(c => row[c]);
                    const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
                    const colNames = cols.map(c => `"${c}"`).join(', ');
                    
                    // We use "OVERRIDING SYSTEM VALUE" if 'id' exists to preserve your original primary keys
                    let query = `INSERT INTO public."${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                    if (cols.includes('id')) {
                        // For PostgreSQL identity columns
                        query = `INSERT INTO public."${table}" (${colNames}) OVERRIDING SYSTEM VALUE VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                    }
                    
                    await pool.query(query, values);
                }
            }
        }

        // 5. INJECT MISSING SALES RETURN SEQUENCE (Added after March 25)
        console.log("Injecting SR (Sales Return) sequence...");
        await pool.query(`
            INSERT INTO document_sequences (document_type, prefix, current_number)
            VALUES ('SR', 'SR-', 1)
            ON CONFLICT DO NOTHING
        `);

        // 6. FINAL COUNT VERIFICATION
        console.log("\n--- FINAL RECOVERY VERIFICATION ---");
        const tablesToCheck = ['chart_of_accounts', 'document_sequences', 'bank_accounts'];
        for (const t of tablesToCheck) {
            const res = await pool.query(`SELECT count(*) FROM ${t}`);
            console.log(`${t}: ${res.rows[0].count} rows`);
        }

        console.log("\nRECOVERY COMPLETE. SYSTEM IS BACK TO MARCH 25 + SALES RETURN.");

    } catch (err) {
        console.error("Critical Recovery failure:", err);
    } finally {
        await pool.end();
    }
}

finalRecovery();
