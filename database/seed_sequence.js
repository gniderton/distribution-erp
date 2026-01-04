const { pool } = require('../config/db');

async function seedSequence() {
    try {
        console.log('Seeding Document Sequence...');

        const query = `
            INSERT INTO document_sequences 
            ("document_type", "prefix", "current_number", "is_active", "branch_id", "company_settings_id")
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
        `;

        // Note: 'Document_Type' might be case sensitive if created with quotes in SQL 
        // Checking 005.sql: create table ... document_type text ... (lowercase)
        // Checking 006.sql: WHERE "Document_Type" = ... (Mixed Case Quotes!) 

        // CRITICAL FIX: The RPC uses "Document_Type" (quoted mixed case), but the table definition in 005.sql 
        // uses lowercase `document_type`. Postgres creates lowercase unless quoted.

        // Let's create a robust query that handles standard lowercase column.

        await pool.query(`
            INSERT INTO document_sequences (document_type, prefix, current_number, is_active)
            SELECT 'PO', 'GD-CLT-PO-26-', 0, true
            WHERE NOT EXISTS (SELECT 1 FROM document_sequences WHERE document_type = 'PO');
        `);

        console.log('Document Sequence Seeded for PO.');

    } catch (err) {
        console.error('Seed Error:', err);
    } finally {
        pool.end();
    }
}

seedSequence();
