
const { pool } = require('./config/db');

async function findDuplicates() {
    try {
        const sql = `
            WITH dup_groups AS (
                SELECT 
                    TRIM(customer_name) as clean_name, 
                    customer_phone, 
                    COUNT(*) as cnt
                FROM customers
                GROUP BY clean_name, customer_phone
                HAVING COUNT(*) > 1
            )
            SELECT 
                c.id, 
                c.customer_name, 
                c.customer_phone, 
                c.verification_status,
                c.route_id,
                c.channel_id,
                (SELECT COUNT(*) FROM sales_invoices WHERE customer_id = c.id) as invoice_count,
                (SELECT COUNT(*) FROM customer_payments WHERE customer_id = c.id) as payment_count,
                (SELECT COUNT(*) FROM trip_returns WHERE customer_id = c.id) as return_count,
                (SELECT COUNT(*) FROM customer_verification_requests WHERE customer_id = c.id) as request_count
            FROM customers c
            JOIN dup_groups dg ON TRIM(c.customer_name) = dg.clean_name AND (c.customer_phone = dg.customer_phone OR (c.customer_phone IS NULL AND dg.customer_phone IS NULL))
            ORDER BY dg.clean_name, c.id
        `;
        
        const res = await pool.query(sql);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findDuplicates();
