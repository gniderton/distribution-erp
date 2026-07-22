const { pool } = require('./config/db');

async function test() {
  try {
    const res = await pool.query("SELECT id, product_name FROM products WHERE product_name ILIKE '%RG GINGELLY OIL 500 ML%'");
    const products = res.rows;
    console.log("Products:", products);
    
    if (products.length > 0) {
      const id = products[0].id;
      const batches = await pool.query("SELECT count(*) FROM inventory_batches WHERE product_id = $1", [id]);
      console.log("Batches count:", batches.rows[0].count);
      
      const ledger = await pool.query("SELECT count(*) FROM stock_traceability WHERE product_id = $1", [id]);
      console.log("Ledger count:", ledger.rows[0].count);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
