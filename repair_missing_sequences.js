const { pool } = require('./config/db');

async function repairSequences() {
    try {
        console.log("--- REPAIRING MISSING DOCUMENT SEQUENCES ---");
        
        const sequences = [
            { type: 'VENDOR', prefix: 'VEND' },
            { type: 'CUSTOMER', prefix: 'CUST' },
            { type: 'LOAN', prefix: 'LOAN' }
        ];

        for (const seq of sequences) {
            const check = await pool.query("SELECT id FROM document_sequences WHERE document_type = $1", [seq.type]);
            if (check.rows.length === 0) {
                console.log(`Missing '${seq.type}' sequence. Seeding with prefix '${seq.prefix}'...`);
                await pool.query(
                    "INSERT INTO document_sequences (document_type, prefix, current_number) VALUES ($1, $2, 0)",
                    [seq.type, seq.prefix]
                );
            } else {
                console.log(`'${seq.type}' sequence is OK.`);
            }
        }

        console.log("\nSUCCESS: All migration sequences are present and synchronized.");
        
        // Final sanity check
        const r = await pool.query("SELECT document_type, prefix, current_number FROM document_sequences WHERE document_type IN ('VENDOR', 'CUSTOMER', 'LOAN')");
        console.table(r.rows);

    } catch (err) {
        console.error("Critical Failure repairing sequences:", err);
    } finally {
        await pool.end();
    }
}

repairSequences();
