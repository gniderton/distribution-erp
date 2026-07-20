const { pool } = require('../config/db');

async function test() {
    try {
        console.log("Testing invoice-lines query locally...");
        const query = `
            SELECT 
                sil.id as line_id,
                sil.invoice_id,
                si.invoice_number,
                si.invoice_date,
                si.customer_id,
                c.customer_name,
                sil.product_id,
                p.product_name,
                p.product_code,
                p.ean_code,
                p.brand_id,
                b.brand_name,
                sil.shipped_qty,
                sil.rate as selling_rate,
                COALESCE(sil.mrp, ib.mrp, p.mrp, 0) as mrp,
                sil.tax_percent,
                sil.tax_amount,
                sil.gross_amount,
                sil.scheme_amount,
                sil.discount_percent,
                sil.discount_amount,
                sil.taxable_amount as taxable_sales_value,
                sil.amount as net_sales_value,
                sil.batch_id,
                ib.batch_code,
                COALESCE(ib.net_purchase_rate, ib.purchase_rate, p.purchase_rate, 0) as purchase_rate,
                (sil.shipped_qty * COALESCE(ib.net_purchase_rate, ib.purchase_rate, p.purchase_rate, 0)) as cogs,
                (sil.taxable_amount - (sil.shipped_qty * COALESCE(ib.net_purchase_rate, ib.purchase_rate, p.purchase_rate, 0))) as margin_amount,
                CASE 
                    WHEN sil.taxable_amount > 0 
                    THEN ROUND(((sil.taxable_amount - (sil.shipped_qty * COALESCE(ib.net_purchase_rate, ib.purchase_rate, p.purchase_rate, 0))) / sil.taxable_amount) * 100, 2)
                    ELSE 0 
                END as margin_percentage
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN products p ON sil.product_id = p.id
            JOIN customers c ON si.customer_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN inventory_batches ib ON sil.batch_id = ib.id
            LIMIT 5
        `;
        const res = await pool.query(query);
        console.log("Success! Query returned rows:");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error("Query failed:", e);
    } finally {
        await pool.end();
    }
}

test();
