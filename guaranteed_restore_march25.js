const { pool } = require('./config/db');
const fs = require('fs');

async function guaranteedRestore() {
    try {
        console.log("--- STARTING GUARANTEED MARCH 25TH RECOVERY ---");

        // 1. DATA SOURCE
        const jsonPath = 'backups/universal-backup-2026-03-25T05-34-32-581Z.json';
        const backupObj = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const backupData = backupObj.data;

        // 2. TABLES TO RESTORE (SETUP ONLY)
        const setupTables = [
            'route_types',
            'brands',
            'categories',
            'designations',
            'chart_of_accounts',
            'document_sequences',
            'taxes',
            'hsn_codes',
            'bank_accounts',
            'routes',
            'channels'
        ];

        // 3. GET ACTUAL TABLES IN DB
        const dbTablesRes = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
        const actualTables = dbTablesRes.rows.map(r => r.tablename);
        
        const validTables = setupTables.filter(t => actualTables.includes(t));
        console.log(`Found ${validTables.length} valid setup tables in DB to restore: ${validTables.join(', ')}`);

        // 4. CLEAN SLATE
        console.log("Clearing existing setup tables...");
        await pool.query(`TRUNCATE ${validTables.join(', ')} RESTART IDENTITY CASCADE`);

        // 5. RESTORE FROM JSON
        for (const table of validTables) {
            if (backupData[table] && backupData[table].length > 0) {
                console.log(`Restoring ${table} (${backupData[table].length} rows)...`);
                const rows = backupData[table];
                const cols = Object.keys(rows[0]);
                
                for (const row of rows) {
                    const values = cols.map(c => row[c]);
                    const placeholders = cols.map((_, i) => `$${i+1}`).join(', ');
                    const colNames = cols.map(c => `"${c}"`).join(', ');
                    
                    // identity column handling
                    let query = `INSERT INTO public."${table}" (${colNames}) OVERRIDING SYSTEM VALUE VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                    if (!cols.includes('id')) {
                        query = `INSERT INTO public."${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                    }
                    
                    await pool.query(query, values);
                }
            }
        }

        // 6. INJECT MISSING SALES RETURN SEQUENCE (SR)
        console.log("Injecting SR (Sales Return) sequence...");
        await pool.query(`
            INSERT INTO document_sequences (document_type, prefix, current_number)
            VALUES ('SR', 'SR-', 1)
            ON CONFLICT DO NOTHING
        `);

        // 7. FINAL VERIFICATION
        console.log("\n--- FINAL RECOVERY VERIFICATION ---");
        for (const t of ['chart_of_accounts', 'document_sequences', 'bank_accounts']) {
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

guaranteedRestore();
