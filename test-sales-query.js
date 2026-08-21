const { pool } = require('./config/db');
(async () => {
  try {
    const res = await pool.query(`
            SELECT 
                so.*,
                c.customer_name,
                ca.address_line1 as customer_address,
                ca.city as district,
                ca.pincode as pin_code,
                c.gstin,
                c.customer_phone,
                c.email as customer_email,
                c.route_id,
                r.route_name,
                e.full_name as dse_name,
                (
                    SELECT json_agg(json_build_object(
                        'product_id', sol.product_id,
                        'product_name', p.product_name,
                        'qty', sol.ordered_qty,
                        'rate', sol.rate,
                        'amount', sol.amount,
                        'tax_percent', sol.tax_percent,
                        'tax_amount', sol.tax_amount,
                        'mrp', p.mrp
                    ))
                    FROM sales_order_lines sol
                    JOIN products p ON sol.product_id = p.id
                    WHERE sol.sales_order_id = so.id
                ) as lines
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_default_billing = true
            LEFT JOIN routes r ON c.route_id = r.id
            LEFT JOIN employees e ON so.dse_id = e.id
            WHERE 1=1 LIMIT 1
    `);
    console.log('Success:', res.rows.length);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
