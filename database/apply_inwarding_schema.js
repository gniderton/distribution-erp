const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        console.log('--- Applying Purchase Invoices Schema ---');
        const sql = fs.readFileSync(path.join(__dirname, '008_purchase_invoices.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Tables Created Successfully.');

        // Also ensure Sequence for PI exists
        const seqCheck = await pool.query("SELECT * FROM document_sequences WHERE document_type = 'PI'");
        if (seqCheck.rows.length === 0) {
            await pool.query(`
                INSERT INTO document_sequences 
                (document_type, prefix, current_number) 
                VALUES ('PI', 'GD-CLT-PI-26-', 0)
             `);
            console.log('✅ Sequence (PI) Created.');
        } else {
            console.log('ℹ️ Sequence (PI) already exists.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

apply();
