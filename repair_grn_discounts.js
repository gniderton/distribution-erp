const { pool } = require('./config/db');

async function repair() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const grnIds = [53, 54];
        
        // Account ID Mapping
        const ACC_INV = 1;      // 1001
        const ACC_IGST = 4;     // 1010
        const ACC_CGST = 5;     // 1011
        const ACC_SGST = 6;     // 1012
        const ACC_PAYABLE = 7;  // 2001
        const ACC_ROUNDING = 16; // 5003

        for (const id of grnIds) {
            console.log(`\n--- Repairing GRN ID: ${id} ---`);

            // 1. Fetch Lines
            const lineRes = await client.query('SELECT * FROM purchase_invoice_lines WHERE purchase_invoice_header_id = $1', [id]);
            let totalTaxable = 0;
            let totalTax = 0;
            let newGrandTotal = 0;

            for (const line of lineRes.rows) {
                const qty = parseFloat(line.accepted_qty);
                const rate = parseFloat(line.rate);
                const scheme = parseFloat(line.scheme_amount);
                const discPercent = parseFloat(line.discount_percent);
                const tax = parseFloat(line.tax_amount);

                const gross = qty * rate;
                const discountAmount = (gross - scheme) * (discPercent / 100);
                const taxableLine = gross - scheme - discountAmount;
                const netLine = taxableLine + tax;

                console.log(`Line ${line.id}: Gross=${gross.toFixed(2)}, DiscAmt=${discountAmount.toFixed(2)}, Taxable=${taxableLine.toFixed(2)}, Net=${netLine.toFixed(2)}`);

                await client.query(`
                    UPDATE purchase_invoice_lines 
                    SET discount_amount = $1, amount = $2
                    WHERE id = $3
                `, [discountAmount, netLine, line.id]);

                totalTaxable += taxableLine;
                totalTax += tax;
                newGrandTotal += netLine;
            }

            // Round grand total to nearest integer as per ERP standard
            const roundedGrandTotal = Math.round(newGrandTotal);
            const roundingAdjustment = roundedGrandTotal - newGrandTotal;

            // 2. Fetch Header for GST Split Info
            const headerRes = await client.query('SELECT * FROM purchase_invoice_headers WHERE id = $1', [id]);
            const header = headerRes.rows[0];
            
            let cgst = 0, sgst = 0, igst = 0;
            if (parseFloat(header.cgst_amount) > 0 || parseFloat(header.sgst_amount) > 0) {
                cgst = totalTax / 2;
                sgst = totalTax / 2;
            } else {
                igst = totalTax;
            }

            console.log(`Header ${id}: NewTaxable=${totalTaxable.toFixed(2)}, NewTax=${totalTax.toFixed(2)}, NewGrand=${roundedGrandTotal.toFixed(2)} (Adj: ${roundingAdjustment.toFixed(2)})`);

            // 3. Update Header
            await client.query(`
                UPDATE purchase_invoice_headers 
                SET total_net = $1, 
                    taxable_amount = $1,
                    tax_amount = $2, 
                    grand_total = $3,
                    cgst_amount = $4,
                    sgst_amount = $5,
                    igst_amount = $6
                WHERE id = $7
            `, [totalTaxable, totalTax, roundedGrandTotal, cgst, sgst, igst, id]);

            // 4. Update Journal Entries
            const jeRes = await client.query("SELECT id FROM journal_entries WHERE reference_type = 'GRN' AND reference_id = $1", [id]);
            if (jeRes.rows.length > 0) {
                const jeId = jeRes.rows[0].id;
                console.log(`Updating Journal Entry ID: ${jeId}`);

                // Inventory - Debit
                await client.query('UPDATE journal_lines SET debit = $1, credit = 0 WHERE journal_entry_id = $2 AND account_id = $3', [totalTaxable, jeId, ACC_INV]);
                
                // GST
                if (cgst > 0) await client.query('UPDATE journal_lines SET debit = $1, credit = 0 WHERE journal_entry_id = $2 AND account_id = $3', [cgst, jeId, ACC_CGST]);
                if (sgst > 0) await client.query('UPDATE journal_lines SET debit = $1, credit = 0 WHERE journal_entry_id = $2 AND account_id = $3', [sgst, jeId, ACC_SGST]);
                if (igst > 0) await client.query('UPDATE journal_lines SET debit = $1, credit = 0 WHERE journal_entry_id = $2 AND account_id = $3', [igst, jeId, ACC_IGST]);

                // Payable - Credit
                await client.query('UPDATE journal_lines SET debit = 0, credit = $1 WHERE journal_entry_id = $2 AND account_id = $3', [roundedGrandTotal, jeId, ACC_PAYABLE]);

                // Rounding
                if (Math.abs(roundingAdjustment) > 0.001) {
                    const roundCheck = await client.query('SELECT id FROM journal_lines WHERE journal_entry_id = $1 AND account_id = $2', [jeId, ACC_ROUNDING]);
                    if (roundCheck.rows.length > 0) {
                        if (roundingAdjustment > 0) { // We were short, so we add to debit or reduce credit
                            // Actually it's simpler: if totalDebit < totalCredit, we debit rounding.
                            // totalDebit = totalTaxable + totalTax. totalCredit = roundedGrandTotal.
                            // adjustment = roundedGrandTotal - (totalTaxable + totalTax)
                        }
                    }
                    
                    // Let's use a cleaner approach for rounding in JE:
                    // Delete existing rounding and insert the correct one to match the balance.
                    await client.query('DELETE FROM journal_lines WHERE journal_entry_id = $1 AND account_id = $2', [jeId, ACC_ROUNDING]);
                    
                    const currentDebit = totalTaxable + totalTax;
                    const currentCredit = roundedGrandTotal;
                    const diff = currentCredit - currentDebit; // If credit is more, we need more debit
                    
                    if (Math.abs(diff) > 0.001) {
                        if (diff > 0) {
                            await client.query('INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, 0)', [jeId, ACC_ROUNDING, diff]);
                        } else {
                            await client.query('INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES ($1, $2, 0, $3)', [jeId, ACC_ROUNDING, Math.abs(diff)]);
                        }
                    }
                } else {
                    await client.query('DELETE FROM journal_lines WHERE journal_entry_id = $1 AND account_id = $2', [jeId, ACC_ROUNDING]);
                }
            }
        }

        await client.query('COMMIT');
        console.log("\nRepair completed successfully!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Repair failed:", err.message);
    } finally {
        client.release();
        process.exit();
    }
}

repair();
