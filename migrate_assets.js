const { pool } = require('./config/db');

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS asset_categories (
        id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL UNIQUE,
        default_depreciation_rate NUMERIC(5,2) DEFAULT 0,
        default_depreciation_method VARCHAR(50) DEFAULT 'Straight Line',
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table created.');
    
    // Insert defaults if empty
    const res = await pool.query('SELECT COUNT(*) FROM asset_categories');
    if (parseInt(res.rows[0].count) === 0) {
      const defaults = ['Vehicles', 'Machinery', 'Furniture', 'Electronics', 'Buildings', 'Land', 'Software'];
      for (const cat of defaults) {
        await pool.query('INSERT INTO asset_categories (category_name) VALUES ($1)', [cat]);
      }
      console.log('Inserted defaults.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
