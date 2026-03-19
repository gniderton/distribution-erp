const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Helper to generate sequences
async function generateSequence(client, documentType) {
    const seqRes = await client.query(`
        UPDATE document_sequences 
        SET current_number = current_number + 1 
        WHERE document_type = $1 
        RETURNING prefix, current_number
    `, [documentType]);
    
    if (seqRes.rows.length === 0) return `${documentType}-00001`;
    const { prefix, current_number } = seqRes.rows[0];
    return `${prefix}${String(current_number).padStart(5, '0')}`;
}

// POST /api/migration/loans
router.post('/loans', async (req, res) => {
    const client = await pool.connect();
    try {
        const rows = req.body || [];
        if (!Array.isArray(rows)) {
            return res.status(400).json({ error: "Expected an array of objects." });
        }

        await client.query('BEGIN');
        
        let importedCount = 0;

        for (const row of rows) {
            // Read CSV Columns (accounting for potential case/space variations)
            const type = (row.type || '').toUpperCase() === 'PAYABLE' ? 'TAKEN' : 'GIVEN'; 
            const party_id = row.entity_id || null;
            const party_name = row.party_name || row.entity_name || 'Imported Party'; // Fallback
            const party_type = row.party_type || 'DIRECTOR';
            const loan_date = row.loan_date || new Date().toISOString();
            
            const total_amount = parseFloat(row.total_amount) || 0;
            const paid_amount = parseFloat(row.paid_amount) || 0;
            const balance_principal = total_amount - paid_amount;
            const remarks = row.description || 'Historical Bulk Import';

            // Generate Loan Number
            const loan_number = await generateSequence(client, 'LOAN');

            // Insert into Loans table
            await client.query(`
                INSERT INTO loans (
                    loan_number, loan_type, party_type, party_id, party_name,
                    principal_amount, interest_rate_pa, tenor_months, emi_amount,
                    disbursement_date, start_date, balance_principal, balance_interest,
                    status, remarks, created_by
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, 0, 1, $6,
                    $7, $7, $8, 0,
                    'Active', $9, 1
                )
            `, [
                loan_number, type, party_type, party_id, party_name,
                total_amount, loan_date, balance_principal, remarks
            ]);

            importedCount++;
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true, count: importedCount, message: `Successfully imported ${importedCount} loans.` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Loan Bulk Import Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
