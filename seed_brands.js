const { pool } = require('./config/db');

async function work() {
  try {
    // 1. Seed Brands
    const brandData = [
      { name: 'Priyam', code: 'PRI' },
      { name: 'Deepa Gold', code: 'DGL' }
    ];

    for (const b of brandData) {
      // Check if it exists
      const exists = await pool.query('SELECT 1 FROM brands WHERE brand_name = $1', [b.name]);
      if (exists.rowCount === 0) {
        await pool.query(
          'INSERT INTO brands (brand_name, brand_code, is_active) VALUES ($1, $2, true)',
          [b.name, b.code]
        );
        console.log(`Inserted brand: ${b.name}`);
      } else {
        console.log(`Brand ${b.name} already exists.`);
      }
    }

    // 2. Set HSN tax_id to 1 (GST 5%)
    const codesToUpdate = [
      '21069050', '20055100', '20058000', '20089700', '20057000', 
      '20082000', '08132000', '15091000', '15100091', '21033000', 
      '21039090', '18069090', '15180039', '151550', '3401', '3402'
    ];

    const updateRes = await pool.query(
      'UPDATE hsn_codes SET tax_id = 1 WHERE hsn_code = ANY($1)',
      [codesToUpdate]
    );
    console.log(`Updated ${updateRes.rowCount} HSN records with tax_id = 1.`);

    process.exit(0);
  } catch (err) {
    console.error('Error during update:', err);
    process.exit(1);
  }
}

work();
