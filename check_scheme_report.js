const { pool } = require('./config/db');

async function checkReport() {
    try {
        const sql = `
            SELECT 
                si.invoice_number, 
                so.so_number, 
                si.invoice_date, 
                c.customer_name, 
                p.product_name, 
                sol.ordered_qty, 
                sol.tier_applied, 
                COALESCE(sil.scheme_amount, 0) as scheme_val
            FROM sales_invoices si
            JOIN sales_orders so ON si.sales_order_id = so.id
            JOIN sales_order_lines sol ON so.id = sol.sales_order_id
            JOIN products p ON sol.product_id = p.id
            JOIN customers c ON si.customer_id = c.id
            LEFT JOIN sales_invoice_lines sil ON si.id = sil.invoice_id AND sil.product_id = sol.product_id
            WHERE sol.tier_applied ILIKE '%Buy 12 Get 1%' 
               OR sol.tier_applied ILIKE '%Scheme:%'
            ORDER BY si.invoice_date DESC
        `;

        const res = await pool.query(sql);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkReport();
