const { pool } = require('./config/db');

async function findClearanceSource() {
    try {
        console.log('🕵️ ANALYZING JOURNAL ENTRIES FOR CHEQUE CLEARANCES...');
        
        // Find journal entries with "Cheque Cleared" in description
        const res = await pool.query(`
            SELECT id, description, reference_type, reference_id 
            FROM journal_entries 
            WHERE description ILIKE '%Cheque Cleared%'
            LIMIT 5
        `);
        
        console.log('\n--- SAMPLE CLEARANCE ENTRIES ---');
        console.table(res.rows);

        if (res.rows.length > 0) {
            const refTypes = [...new Set(res.rows.map(r => r.reference_type))];
            console.log('\nFound Reference Types:', refTypes);
        } else {
            console.log('\nNo entries found with description matching "Cheque Cleared"');
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

findClearanceSource();
