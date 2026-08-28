const { Pool } = require('pg');
require('dotenv').config();

// Fix IPv6 issue in Render for DB connection
const dns = require('dns');
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
    if (typeof options === 'function') {
        callback = options;
        options = { family: 4 };
    } else {
        options = { ...options, family: 4 };
    }
    return originalLookup.call(dns, hostname, options, callback);
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    await pool.query('ALTER TABLE employees ADD COLUMN device_id VARCHAR(255)');
    console.log('Added device_id to employees table');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('Column device_id already exists.');
    } else {
      console.error('Migration failed:', err.message);
    }
  } finally {
    process.exit();
  }
})();
