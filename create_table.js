const { pool } = require('./config/db');
async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dse_route_briefings (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        dse_id BIGINT NOT NULL REFERENCES employees(id),
        customer_id BIGINT NOT NULL REFERENCES customers(id),
        route_date DATE NOT NULL,
        target_objective TEXT CHECK (target_objective IN ('Order', 'Payment', 'Both', 'CheckIn', 'None')),
        inactive_reason TEXT,
        dse_notes TEXT,
        status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Missed'))
      );
      CREATE INDEX IF NOT EXISTS idx_route_briefings_dse_date ON dse_route_briefings(dse_id, route_date);
    `);
    console.log('Table created!');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
