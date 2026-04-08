const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
});

async function checkAndSeed() {
  try {
    const res = await pool.query("SELECT * FROM document_sequences WHERE document_type = 'SR'");
    console.log('Current SR Sequence:', res.rows);
    
    if (res.rows.length === 0) {
      console.log('SR Sequence missing. Seeding...');
      await pool.query("INSERT INTO document_sequences (document_type, prefix, current_number) VALUES ('SR', 'SR-', 0)");
      console.log('Seeded SR Sequence.');
    }
  } catch (err) {
    console.error('Error during checkAndSeed:', err);
  } finally {
    await pool.end();
  }
}

checkAndSeed();
