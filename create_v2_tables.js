const { pool } = require('./config/db');

async function build() {
    try {
        console.log('🏗️  Building Phoenix Ledger (v2) Tables...');
        await pool.query('BEGIN');

        // 1. Create Entries V2
        await pool.query(`
            CREATE TABLE IF NOT EXISTS journal_entries_v2 (
                id SERIAL PRIMARY KEY,
                transaction_date DATE NOT NULL,
                description TEXT,
                reference_type TEXT NOT NULL,
                reference_id BIGINT,
                created_at TIMESTAMP DEFAULT NOW(),
                source_table VARCHAR,
                source_id BIGINT
            )
        `);

        // 2. Create Lines V2
        await pool.query(`
            CREATE TABLE IF NOT EXISTS journal_lines_v2 (
                id SERIAL PRIMARY KEY,
                journal_entry_id BIGINT REFERENCES journal_entries_v2(id) ON DELETE CASCADE,
                account_id INTEGER,
                debit NUMERIC DEFAULT 0,
                credit NUMERIC DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                bank_account_id INTEGER
            )
        `);

        await pool.query('COMMIT');
        console.log('✅ Phoenix Ledger Tables created successfully.');
    } catch(e) {
        await pool.query('ROLLBACK');
        console.error('❌ Table Creation Failed:', e.message);
    } finally {
        process.exit();
    }
}

build();
