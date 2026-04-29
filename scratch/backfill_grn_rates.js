const { pool } = require('../config/db');

async function backfillRates() {
    try {
        console.log('--- Backfilling net_purchase_rate for GRN 78, 79 ---');
        
        const lines = await pool.query(`
            SELECT pil.id, pil.amount, pil.tax_amount, pil.accepted_qty, pil.product_id, pil.purchase_invoice_header_id
            FROM purchase_invoice_lines pil
            WHERE pil.purchase_invoice_header_id IN (78, 79)
        `);

        for (const line of lines.rows) {
            const netRate = (Number(line.amount) - Number(line.tax_amount)) / Number(line.accepted_qty);
            console.log(`Updating Line ${line.id}: Net Rate ${netRate.toFixed(2)}`);
            
            await pool.query(`
                UPDATE inventory_batches 
                SET net_purchase_rate = $1 
                WHERE purchase_invoice_line_id = $2
            `, [netRate, line.id]);
        }
        
        console.log('✅ Backfill complete.');

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

backfillRates();
