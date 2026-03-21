const { pool } = require('../config/db');

async function run() {
    try {
        await pool.query(`
            INSERT INTO document_sequences (document_type, prefix, current_number) 
            VALUES 
                ('DEBIT_NOTE', 'PEN-26-', 1), 
                ('CREDIT_NOTE', 'VPEN-26-', 1) 
            ON CONFLICT (document_type) DO NOTHING
        `);
        console.log('✅ Penalty Sequences Added');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
