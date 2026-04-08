const { pool } = require('./config/db');

async function repairAccounting() {
    const isDryRun = process.argv.includes('--apply') ? false : true;
    console.log(isDryRun ? "DRY RUN MODE (Accounting)" : "APPLY MODE (Accounting)");

    try {
        // 1. Find all payments with duplicate journal entries
        const res = await pool.query(`
            SELECT reference_id, COUNT(*) as entry_count
            FROM journal_entries
            WHERE reference_type = 'CUST_PAY'
            GROUP BY reference_id
            HAVING COUNT(*) > 1
        `);

        if (res.rows.length === 0) {
            console.log("No duplicate journal entries found.");
            return;
        }

        console.log(`Found ${res.rows.length} payments with duplicate GL entries.`);

        for (const row of res.rows) {
            const payId = row.reference_id;
            
            // Get all entries for this payment, ordered by ID (original first)
            const entries = await pool.query(`
                SELECT id, description, created_at 
                FROM journal_entries 
                WHERE reference_type = 'CUST_PAY' AND reference_id = $1
                ORDER BY id ASC
            `, [payId]);

            const original = entries.rows[0];
            const redundant = entries.rows.slice(1);

            console.log(`\nPayment ID: ${payId}`);
            console.log(`  Keeping Original Entry: ${original.description} (ID: ${original.id})`);
            console.log(`  Removing ${redundant.length} Redundant Entries...`);

            if (!isDryRun) {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    
                    for (const entry of redundant) {
                        console.log(`    Deleting Entry ${entry.description} (ID: ${entry.id})...`);
                        
                        // Delete associated lines first (foreign key constraint)
                        await client.query('DELETE FROM journal_lines WHERE journal_entry_id = $1', [entry.id]);
                        
                        // Delete header
                        await client.query('DELETE FROM journal_entries WHERE id = $1', [entry.id]);
                    }

                    await client.query('COMMIT');
                    console.log(`  SUCCESS: Accounting for Payment ${payId} cleaned.`);
                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error(`  ERROR: Failed to clean accounting for payment ${payId}:`, err.message);
                } finally {
                    client.release();
                }
            } else {
                redundant.forEach(e => console.log(`    [DRY-RUN] Would delete Entry ${e.journal_number} (ID: ${e.id})`));
            }
        }

        console.log("\nAccounting cleanup scan complete.");

    } catch (err) {
        console.error("Accounting Repair Error:", err);
    } finally {
        await pool.end();
    }
}

repairAccounting();
