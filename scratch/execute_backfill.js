const { pool } = require('../config/db');

async function performBackfill() {
    const client = await pool.connect();
    try {
        console.log('--- Starting "Truth-First" Stock Traceability Backfill ---');

        // --- 1. GRN BACKFILL ---
        console.log('\n[1/2] Processing GRNs...');
        const grnLines = await client.query(`
            SELECT 
                pil.id as line_id, 
                pil.purchase_invoice_header_id as grn_id, 
                pil.product_id, 
                pil.accepted_qty, 
                h.invoice_number, 
                h.received_date
            FROM purchase_invoice_lines pil
            JOIN purchase_invoice_headers h ON pil.purchase_invoice_header_id = h.id
            WHERE h.status != 'Cancelled' AND h.status != 'Reversed'
            AND EXISTS (
                SELECT 1 FROM inventory_batches ib
                LEFT JOIN stock_traceability st ON st.batch_id = ib.id AND st.transaction_type = 'IN'
                WHERE ib.purchase_invoice_line_id = pil.id AND st.id IS NULL
            )
        `);

        let grnSuccess = 0;
        let grnFixed = 0;
        let grnSkipped = 0;

        for (const line of grnLines.rows) {
            // Find batches for this line
            const batches = await client.query(`
                SELECT id, quantity_initial 
                FROM inventory_batches 
                WHERE purchase_invoice_line_id = $1
            `, [line.line_id]);

            if (batches.rows.length === 0) {
                console.warn(`  ⚠️ No batches found for GRN Line ${line.line_id} (Prod: ${line.product_id})`);
                continue;
            }

            if (batches.rows.length === 1) {
                const batch = batches.rows[0];
                const finalQty = Number(line.accepted_qty);
                const batchInitial = Number(batch.quantity_initial);

                // Check again to be super safe
                const check = await client.query(`SELECT id FROM stock_traceability WHERE batch_id = $1 AND transaction_type = 'IN'`, [batch.id]);
                if (check.rows.length > 0) continue;

                // Insert Trace
                await client.query(`
                    INSERT INTO stock_traceability (
                        batch_id, product_id, quantity_change, transaction_type, 
                        reference_id, reference_type, notes, created_at
                    ) VALUES ($1, $2, $3, 'IN', $4, 'Purchase Invoice', $5, $6)
                `, [batch.id, line.product_id, finalQty, line.grn_id, `Backfilled from GRN ${line.invoice_number}`, line.received_date]);

                console.log(`  [GRN] Logged ${finalQty} for Batch ${batch.id} (Ref: ${line.invoice_number})`);

                // Correction: Match batch initial qty to invoice truth
                if (finalQty !== batchInitial) {
                    await client.query(`UPDATE inventory_batches SET quantity_initial = $1 WHERE id = $2`, [finalQty, batch.id]);
                    grnFixed++;
                }
                grnSuccess++;
            } else {
                // Multi-batch split (Rare) - Distribute line qty based on batch ratios
                const totalBatchInitial = batches.rows.reduce((sum, b) => sum + Number(b.quantity_initial), 0);
                for (const batch of batches.rows) {
                    // Check again
                    const check = await client.query(`SELECT id FROM stock_traceability WHERE batch_id = $1 AND transaction_type = 'IN'`, [batch.id]);
                    if (check.rows.length > 0) continue;

                    const ratio = totalBatchInitial > 0 ? (Number(batch.quantity_initial) / totalBatchInitial) : (1 / batches.rows.length);
                    const distributedQty = Number((line.accepted_qty * ratio).toFixed(3));
                    
                    await client.query(`
                        INSERT INTO stock_traceability (
                            batch_id, product_id, quantity_change, transaction_type, 
                            reference_id, reference_type, notes, created_at
                        ) VALUES ($1, $2, $3, 'IN', $4, 'Purchase Invoice', $5, $6)
                    `, [batch.id, line.product_id, distributedQty, line.grn_id, `Backfilled (Distributed) from GRN ${line.invoice_number}`, line.received_date]);
                    
                    // Update initial qty to match distribution
                    await client.query(`UPDATE inventory_batches SET quantity_initial = $1 WHERE id = $2`, [distributedQty, batch.id]);
                    grnFixed++;
                }
                grnSuccess++;
            }
        }
        console.log(`✅ GRN Backfill Done: ${grnSuccess} lines processed, ${grnFixed} batch totals corrected.`);

        // --- 2. DEBIT NOTE BACKFILL ---
        console.log('\n[2/2] Processing Debit Notes...');
        const dnLines = await client.query(`
            SELECT 
                dnl.id as line_id, 
                dnl.debit_note_id, 
                dnl.product_id, 
                dnl.qty, 
                dnl.batch_number, 
                dn.debit_note_number, 
                dn.debit_note_date, 
                dn.note_type
            FROM debit_note_lines dnl
            JOIN debit_notes dn ON dnl.debit_note_id = dn.id
            WHERE dn.status NOT IN ('Cancelled', 'Reversed')
            AND NOT EXISTS (
                SELECT 1 FROM stock_traceability st
                WHERE st.reference_id = dn.id AND st.product_id = dnl.product_id AND st.transaction_type = 'OUT'
            )
        `);

        let dnSuccess = 0;
        let dnSkipped = 0;

        for (const line of dnLines.rows) {
            // Check if trace already exists
            const existing = await client.query(`
                SELECT id FROM stock_traceability 
                WHERE reference_id = $1 AND product_id = $2 AND transaction_type = 'OUT' AND reference_type = $3
            `, [line.debit_note_id, line.product_id, line.note_type]);

            if (existing.rows.length > 0) {
                dnSkipped++;
                continue;
            }

            // Find the most likely batch (matching product and code)
            const batches = await client.query(`
                SELECT id FROM inventory_batches 
                WHERE product_id = $1 AND batch_code = $2
                ORDER BY created_at DESC LIMIT 1
            `, [line.product_id, line.batch_number]);

            const targetBatchId = batches.rows.length > 0 ? batches.rows[0].id : null;

            await client.query(`
                INSERT INTO stock_traceability (
                    batch_id, product_id, quantity_change, transaction_type, 
                    reference_id, reference_type, notes, created_at
                ) VALUES ($1, $2, $3, 'OUT', $4, $5, $6, $7)
            `, [targetBatchId, line.product_id, -Number(line.qty), line.debit_note_id, line.note_type, `Backfilled from ${line.note_type} ${line.debit_note_number}`, line.debit_note_date]);
            
            dnSuccess++;
        }
        console.log(`✅ Debit Note Backfill Done: ${dnSuccess} logs created, ${dnSkipped} already existed.`);

        console.log('\n--- ALL BACKFILL OPERATIONS COMPLETED SUCCESSFULLY ---');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Critical Error during backfill:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

performBackfill();
