const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function run() {
  try {
    // 1. Read blueprint and extract logo base64
    const blueprintPath = path.join(__dirname, 'inventory_blueprint.txt');
    const blueprint = fs.readFileSync(blueprintPath, 'utf8');
    
    // Find the logo base64 string
    const match = blueprint.match(/logo:\s*"([^"]+)"/);
    let logoBase64 = '';
    if (match && match[1]) {
      logoBase64 = match[1];
      console.log('Successfully extracted logo base64! Length:', logoBase64.length);
    } else {
      console.log('Warning: Logo base64 not found in blueprint. Using default empty string.');
    }

    // 2. Run alter table commands
    console.log('Altering company_settings table...');
    await pool.query(`
      ALTER TABLE company_settings 
      ADD COLUMN IF NOT EXISTS logo TEXT,
      ADD COLUMN IF NOT EXISTS regt_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS district VARCHAR(100),
      ADD COLUMN IF NOT EXISTS contact_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS email VARCHAR(100)
    `);
    console.log('Columns added successfully.');

    // 3. Update the settings row
    console.log('Updating settings row...');
    const result = await pool.query(`
      UPDATE company_settings 
      SET 
        company_name = 'GNIDERTON DISTRIBUTIONS PVT LTD',
        regt_name = 'GNIDERTON DISTRIBUTIONS PVT LTD',
        gstin = '32AAACG1924D1ZS',
        state_code = 32,
        address = 'Industrial Development Area, Kozhikode, Kerala',
        district = 'Kozhikode',
        contact_no = '+91 495 272 1924',
        email = 'accounts@gniderton.com',
        logo = $1
      WHERE id = 1
      RETURNING *
    `, [logoBase64]);

    console.log('Row updated successfully:', result.rows[0]);
  } catch (err) {
    console.error('Migration Error:', err.message);
  }
  process.exit(0);
}

run();
