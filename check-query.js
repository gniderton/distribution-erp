const { pool } = require('./config/db');
(async () => {
  try {
    const query = `
      SELECT 
          ca.customer_id,
          c.customer_name,
          e.full_name as dse_name,
          SUM(ca.balance) AS total_advance_balance,
          COUNT(ca.id) AS advance_count,
          MAX(ca.created_at) AS last_advance_date
      FROM customer_advances ca
      JOIN customers c ON ca.customer_id = c.id
      LEFT JOIN employees e ON c.dse_id = e.id
      WHERE ca.is_active = true AND ca.balance > 0
      GROUP BY ca.customer_id, c.customer_name, e.full_name ORDER BY total_advance_balance DESC
    `;
    const res = await pool.query(query, []);
    console.log('Query result:', res.rows.length, 'rows');
    if (res.rows.length > 0) console.log(res.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
