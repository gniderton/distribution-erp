const { pool } = require('../config/db');

async function main() {
  try {
    const resRoutes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'routes'
    `);
    console.log("ROUTES COLUMNS:", resRoutes.rows);

    const resCust = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
    `);
    console.log("CUSTOMERS COLUMNS:", resCust.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

main();
