const { pool } = require('./config/db');
async function run() {
  try {
    const { rows } = await pool.query(`
      SELECT c.customer_name, r.route_name, e.full_name as dse_name 
      FROM customers c 
      JOIN routes r ON c.route_id = r.id 
      JOIN employees e ON c.dse_id = e.id
      WHERE e.full_name ILIKE '%saleem%'
    `);
    console.log(JSON.stringify(rows, null, 2));
  } catch(e) { console.error(e); }
  pool.end();
}
run();
