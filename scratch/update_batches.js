const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

const updates = [
  { id: 1626, batch_code: '306G17', expiry_date: '2027-05-30' },
  { id: 1627, batch_code: '304G22', expiry_date: '2027-04-30' },
  { id: 1628, batch_code: '405G19', expiry_date: '2027-04-30' },
  { id: 1629, batch_code: '106G10', expiry_date: '2027-05-30' },
  { id: 1630, batch_code: '106G18', expiry_date: '2027-05-30' },
  { id: 1631, batch_code: '105G22', expiry_date: '2027-05-30' },
  { id: 1632, batch_code: '206G3', expiry_date: '2027-05-30' },
  { id: 1633, batch_code: '206G22', expiry_date: '2027-05-30' },
  { id: 1634, batch_code: '306G17', expiry_date: '2027-05-30' },
  { id: 1635, batch_code: '106G21', expiry_date: '2027-10-30' },
  { id: 1636, batch_code: 'V.F.T-51', expiry_date: '2027-05-30' },
  { id: 1637, batch_code: '105G11', expiry_date: '2027-11-30' },
  { id: 1638, batch_code: '206G10', expiry_date: '2027-11-30' },
  { id: 1639, batch_code: '104G24', expiry_date: '2027-10-30' },
  { id: 1640, batch_code: '106G18', expiry_date: '2027-05-30' },
  { id: 1641, batch_code: '106G10', expiry_date: '2027-05-30' }
];

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to database. Starting transaction...");
    await client.query('BEGIN');
    
    for (const item of updates) {
      const query = `
        UPDATE inventory_batches
        SET batch_code = $1, expiry_date = $2
        WHERE id = $3
        RETURNING id, batch_code, expiry_date
      `;
      const res = await client.query(query, [item.batch_code, item.expiry_date, item.id]);
      if (res.rowCount === 0) {
        console.warn(`Warning: No row found with ID ${item.id}`);
      } else {
        console.log(`Updated ID ${res.rows[0].id}: batch_code = ${res.rows[0].batch_code}, expiry_date = ${res.rows[0].expiry_date}`);
      }
    }
    
    await client.query('COMMIT');
    console.log("Transaction committed successfully!");
  } catch (e) {
    console.error("Error during transaction, rolling back...", e);
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error("Rollback error:", rollbackErr);
    }
  } finally {
    await client.end();
  }
}

run();
