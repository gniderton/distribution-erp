const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { pool } = require('../config/db');

const TABLES_DIR = path.join(__dirname, '../tables');

async function importSequences() {
    const file = fs.readdirSync(TABLES_DIR).find(f => f.startsWith('dbo-document_sequence'));
    if (!file) return console.log('Sequence CSV not found.');

    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(path.join(TABLES_DIR, file))
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', async () => {
                try {
                    console.log(`Importing Sequences...`);
                    for (const row of rows) {
                        // Logic: Insert directly.
                        // Columns: id, created_at, company_settings_id, branch_id, Document_Type, prefix, current_number
                        await pool.query(
                            `INSERT INTO document_sequences (id, company_settings_id, branch_id, document_type, prefix, current_number)
                OVERRIDING SYSTEM VALUE
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE 
                SET current_number = EXCLUDED.current_number, prefix = EXCLUDED.prefix`,
                            [
                                parseInt(row.id),
                                parseInt(row.company_settings_id || 1),
                                parseInt(row.branch_id || 1),
                                row.Document_Type,
                                row.prefix,
                                parseInt(row.current_number)
                            ]
                        );
                    }
                    await pool.query("SELECT setval('document_sequences_id_seq', (SELECT MAX(id) FROM document_sequences))");
                    console.log('Sequences imported.');
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
    });
}

async function run() {
    try {
        await importSequences();
    } catch (err) {
        console.error('Import Error:', err);
    } finally {
        pool.end();
    }
}

run();
