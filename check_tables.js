const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('products', 'inventory_batches')"))
  .then(r => {
    r.rows.forEach(row => console.log(row.table_name, row.column_name, row.data_type))
  })
  .catch(console.error)
  .finally(() => client.end());
