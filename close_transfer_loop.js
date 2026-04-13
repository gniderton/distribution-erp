const { pool } = require('./config/db');

async function closeTraceabilityLoop() {
    try {
        console.log('🔗 Bridging Internal Transfers to Journal Entries (Type Fix)...');
        
        const q = `
            UPDATE journal_entries 
            SET 
                source_table = 'internal_transfers',
                source_id = t.id,
                reference_id = t.id
            FROM internal_transfers t
            WHERE journal_entries.id = t.journal_entry_id 
            AND (journal_entries.source_id IS NULL OR journal_entries.source_table IS NULL)
        `;

        const res = await pool.query(q);
        console.log(`✅ SUCCESS: ${res.rowCount} journal entries now correctly point back to their source transfers.`);

    } catch (e) {
        console.error('❌ ERROR:', e.message);
    } finally {
        process.exit();
    }
}

closeTraceabilityLoop();
