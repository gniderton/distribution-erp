const { pool } = require('./config/db');

async function test() {
    const client = await pool.connect();
    try {
        const vendor_id = 8; 
        
        const amount = 2944.07;
        const debit_note_date = '2026-08-15';
        const reason = '';
        const linked_invoice_id = null;
        const note_type = 'Return Slip';
        const lines = [
            {
                product_id: 1, 
                qty: 1,
                rate: 2803.87,
                amount: 2944.07,
                batch_number: 'B1', 
                return_type: 'Damage',
                tax_percentage: 5
            }
        ];

        let resolvedInvoiceId = null;

        await client.query('BEGIN');

        const docType = note_type === 'Return Slip' ? 'RS' : 'DN';
        const seqRes = await client.query(`
            SELECT prefix, current_number 
            FROM document_sequences 
            WHERE document_type = $1 AND is_active = true
            FOR UPDATE
        `, [docType]);

        let dnNumber = 'RS-0001';

        const insertRes = await client.query(`
            INSERT INTO debit_notes 
            (vendor_id, debit_note_number, debit_note_date, amount, reason, linked_invoice_id, status, note_type)
            VALUES ($1, $2, $3, $4, $5, $6, 'Approved', $7)
            RETURNING id, debit_note_number
        `, [vendor_id, dnNumber, debit_note_date || new Date(), amount, reason, resolvedInvoiceId, note_type]);
        const newId = insertRes.rows[0].id;

        for (const line of lines) {
            const lineAmount = Number(line.amount);
            let lineTaxPct = line.tax_percentage;
            let lineTaxAmt = line.tax_amount;

            if (lineTaxPct === undefined) {
                const taxRes = await client.query(`
                    SELECT t.tax_percentage 
                    FROM products p LEFT JOIN taxes t ON p.tax_id = t.id WHERE p.id = $1
                `, [line.product_id]);
                lineTaxPct = taxRes.rows.length > 0 ? Number(taxRes.rows[0].tax_percentage) : 0;
            }

            if (lineTaxAmt === undefined) {
                const taxable = lineAmount / (1 + (lineTaxPct / 100));
                lineTaxAmt = lineAmount - taxable;
            }

            await client.query(`
                INSERT INTO debit_note_lines 
                (debit_note_id, product_id, qty, rate, amount, batch_number, return_type, tax_percentage, tax_amount)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [newId, line.product_id, line.qty, line.rate, lineAmount, line.batch_number, line.return_type || 'Damage', lineTaxPct, lineTaxAmt]);

            let remainingReturnQty = Number(line.qty);
            if (remainingReturnQty > 0) {
                const findBatches = async (targetStatus) => {
                    let q = `SELECT id, quantity_remaining, batch_code FROM inventory_batches WHERE product_id = $1 AND quantity_remaining > 0`;
                    const p = [line.product_id];
                    if (targetStatus) { q += ` AND status = $${p.length + 1}`; p.push(targetStatus); }
                    if (line.batch_number && line.batch_number.trim() !== '') { q += ` AND batch_code = $${p.length + 1}`; p.push(line.batch_number.trim()); }
                    q += ` ORDER BY created_at ASC FOR UPDATE`;
                    return await client.query(q, p);
                };

                let batches = await findBatches(line.return_type);
                if (batches.rows.length === 0 && line.return_type !== 'Good') {
                    batches = await findBatches('Good');
                }
            }
        }

        let totalTax = 140.20;
        let totalTaxable = 2803.87;
        let cgstVal = 70.10, sgstVal = 70.10, igstVal = 0, posVal = '32';

        const vendRes = await client.query('SELECT gst FROM vendors WHERE id = $1', [vendor_id]);

        await client.query(`
            UPDATE debit_notes SET taxable_amount = $1, tax_amount = $2, cgst_amount = $3, sgst_amount = $4, igst_amount = $5, place_of_supply = $6 WHERE id = $7
        `, [totalTaxable, totalTax, cgstVal, sgstVal, igstVal, posVal, newId]);

        console.log("SUCCESS");
        await client.query('ROLLBACK');

    } catch (e) {
        console.error(e.message);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        pool.end();
    }
}
test();
