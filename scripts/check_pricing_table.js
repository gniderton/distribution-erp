const { pool } = require('../config/db');

async function checkPricingSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_brand_pricing'
    `);
    console.log('--- Columns for customer_brand_pricing ---');
    console.table(res.rows);

    const constr = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'customer_brand_pricing'::regclass
    `);
    console.log('\n--- Constraints for customer_brand_pricing ---');
    console.table(constr.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkPricingSchema();
