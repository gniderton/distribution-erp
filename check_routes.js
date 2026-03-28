const { pool } = require('./config/db');

async function checkRoutes() {
  try {
    const res = await pool.query("SELECT DISTINCT service_day FROM routes");
    console.log("Service Days in DB:", res.rows.map(r => r.service_day));
    
    const dayRes = await pool.query("SELECT TRIM(TO_CHAR(CURRENT_DATE, 'Day')) as today");
    console.log("Today's format (Postgres):", dayRes.rows[0].today);
    
    // Check if any customers are actually on today's route
    const custRes = await pool.query(`
        SELECT COUNT(*) as count 
        FROM customers c 
        JOIN routes r ON c.route_id = r.id 
        WHERE TRIM(TO_CHAR(CURRENT_DATE, 'Day')) = r.service_day
    `);
    console.log("Customers on today's route (any DSE):", custRes.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkRoutes();
