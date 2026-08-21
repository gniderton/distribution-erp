const { pool } = require('./config/db');

async function test() {
    try {
        const id = '1';
        const nameRes = await pool.query('SELECT scheme_name FROM schemes WHERE id = $1', [id]);
        if (nameRes.rows.length === 0) return console.log('Scheme not found');
        const name = nameRes.rows[0].scheme_name;

        const params = [`%[ID:${id}]%`, `%${name}%`];

        const baseCTE = `
            WITH scheme_lines AS (
                SELECT 
                    sil.invoice_id,
                    sil.product_id,
                    sil.shipped_qty,
                    sil.rate,
                    sil.amount,
                    sil.scheme_amount,
                    sil.tier_applied,
                    si.invoice_number,
                    si.customer_id,
                    c.customer_name,
                    c.dse_id,
                    e.full_name as dse_name,
                    p.product_name
                FROM sales_invoice_lines sil
                JOIN sales_invoices si ON sil.invoice_id = si.id
                JOIN customers c ON si.customer_id = c.id
                JOIN products p ON sil.product_id = p.id
                LEFT JOIN employees e ON c.dse_id = e.id
                WHERE (sil.tier_applied ILIKE $1 OR sil.tier_applied ILIKE $2)
                  AND si.status != 'Cancelled'
            )
        `;

        const kpiQuery = `
            ${baseCTE}
            SELECT 
                COALESCE(SUM(scheme_amount), 0) as total_discount,
                COALESCE(SUM(amount), 0) as net_revenue,
                COUNT(DISTINCT invoice_id) as invoices_impacted
            FROM scheme_lines
        `;
        const kpiRes = await pool.query(kpiQuery, params);
        console.log("KPIs:", kpiRes.rows);

    } catch (e) {
        console.error("SQL ERROR:", e.message);
    } finally {
        pool.end();
    }
}
test();
