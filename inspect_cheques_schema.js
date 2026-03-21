const { pool } = require('./config/db');

async function inspect() {
  try {
    const chequesRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cheques'");
    console.log("--- CHEQUES TABLE ---");
    console.log(JSON.stringify(chequesRes.rows, null, 2));

    const banksRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'master_banks'");
    console.log("\n--- MASTER_BANKS TABLE ---");
    console.log(JSON.stringify(banksRes.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
inspect();
