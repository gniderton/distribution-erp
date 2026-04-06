const { pool } = require('./config/db');

async function repair() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Searching for invoice lines with missing batch_id...");

        // 1. Fetch all lines that need repair
        const linesRes = await client.query(`
            SELECT id, invoice_id, product_id, shipped_qty, rate, mrp, 
                   gross_amount, scheme_amount, taxable_amount, tax_percent, tax_amount, amount, tier_applied
            FROM sales_invoice_lines 
            WHERE batch_id IS NULL
        `);

        console.log(`Found ${linesRes.rows.length} lines to process.`);

        for (const line of linesRes.rows) {
            // 2. Find corresponding traceability records
            const traceRes = await client.query(`
                SELECT batch_id, ABS(quantity_change) as qty
                FROM stock_traceability
                WHERE reference_id = $1 
                  AND product_id = $2 
                  AND reference_type = 'Sales Invoice'
                  AND quantity_change < 0
            `, [line.invoice_id, line.product_id]);

            if (traceRes.rows.length === 0) {
                console.warn(`⚠️ No traceability found for Line ID ${line.id} (Inv: ${line.invoice_id}, Prod: ${line.product_id}). Skipping.`);
                continue;
            }

            console.log(`Processing Line ID ${line.id}: Splitting into ${traceRes.rows.length} batches.`);

            // 3. Delete the original NULL line
            await client.query('DELETE FROM sales_invoice_lines WHERE id = $1', [line.id]);

            // 4. Insert new lines for each batch
            const originalQty = Number(line.shipped_qty);
            
            for (const trace of traceRes.rows) {
                const batchQty = Number(trace.qty);
                const ratio = batchQty / originalQty;

                // Pro-rate financials
                const gross = Number((line.gross_amount * ratio).toFixed(2));
                const scheme = Number((line.scheme_amount * ratio).toFixed(2));
                const taxable = Number((line.taxable_amount * ratio).toFixed(2));
                const tax = Number((line.tax_amount * ratio).toFixed(2));
                const total = Number((line.amount * ratio).toFixed(2));

                await client.query(`
                    INSERT INTO sales_invoice_lines (
                        invoice_id, product_id, batch_id, shipped_qty, rate, mrp,
                        gross_amount, scheme_amount, taxable_amount, tax_percent, tax_amount, amount, tier_applied
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `, [
                    line.invoice_id, line.product_id, trace.batch_id, batchQty, line.rate, line.mrp,
                    gross, scheme, taxable, line.tax_percent, tax, total, line.tier_applied
                ]);
            }
        }

        await client.query('COMMIT');
        console.log("✅ Repair completed successfully.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Repair failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

repair();
