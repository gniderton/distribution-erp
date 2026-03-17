const { pool } = require('./config/db');

async function debugQuery() {
    const id = 11; // From user request
    try {
        const result = await pool.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY dnl.id) as "S.No",
                p.ean_code as "EAN Code",
                p.product_code as "product_code",
                h.hsn_code as "hsn_code",
                p.product_name as "Item Name",
                p.mrp as "MRP",
                dnl.rate as "Price",
                dnl.qty as "Qty",
                0 as "Sch",
                0 as "Disc %",
                t.tax_percentage as "GST %",
                (dnl.qty * dnl.rate) as "Gross $",
                0 as "Disc. $",
                ROUND((dnl.amount / (1 + (COALESCE(t.tax_percentage, 0)/100.0)))::numeric, 2) as "Taxable $",
                ROUND((dnl.amount - (dnl.amount / (1 + (COALESCE(t.tax_percentage, 0)/100.0))))::numeric, 2) as "GST $",
                dnl.amount as "Net $",
                dnl.batch_number as "Batch No",
                ib.expiry_date as "Expiry",
                dnl.product_id as "_product_id"
            FROM debit_note_lines dnl
            JOIN products p ON dnl.product_id = p.id
            LEFT JOIN taxes t ON p.tax_id = t.id
            LEFT JOIN hsn_codes h ON p.hsn_id = h.id
            LEFT JOIN inventory_batches ib ON dnl.batch_number = ib.batch_code AND dnl.product_id = ib.product_id
            WHERE dnl.debit_note_id = $1
        `, [id]);
        console.log('Success:', result.rows);
    } catch (err) {
        console.error('DATABASE ERROR:', err.message);
    } finally {
        pool.end();
    }
}

debugQuery();
