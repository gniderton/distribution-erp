const { pool } = require('../config/db');

async function findDuplicateCheques() {
  try {
    const specificIds = [13, 16, 19];
    console.log('--- Investigating Specific Cheque IDs: 13, 16, 19 ---');

    for (const id of specificIds) {
      const origRes = await pool.query('SELECT * FROM cheques WHERE id = $1', [id]);
      if (origRes.rows.length === 0) {
        console.log(`❌ ID ${id} not found.`);
        continue;
      }

      const orig = origRes.rows[0];
      const matchRes = await pool.query(
        'SELECT * FROM cheques WHERE cheque_number = $1 AND amount = $2 AND id != $3',
        [orig.cheque_number, orig.amount, id]
      );

      console.log(`\n🔍 Original Record ID: ${id}`);
      console.log(`   Number: ${orig.cheque_number} | Amount: ${orig.amount} | Date: ${orig.cheque_date.toISOString().split('T')[0]}`);
      console.log(`   Status: ${orig.status} | Ref: ${orig.reference_type} #${orig.reference_id}`);

      if (matchRes.rows.length > 0) {
        console.log(`⚠️  FOUND ${matchRes.rows.length} DUPLICATE(S):`);
        matchRes.rows.forEach(m => {
          console.log(`   -> Duplicate ID: ${m.id} | Status: ${m.status} | Created: ${m.created_at.toISOString()}`);
        });
      } else {
        console.log('✅ No duplicates found for this cheque number/amount pair.');
      }
    }

    // Also check for any general duplicates in the table
    const generalRes = await pool.query(`
      SELECT cheque_number, amount, count(*) 
      FROM cheques 
      GROUP BY cheque_number, amount 
      HAVING count(*) > 1
    `);
    
    if (generalRes.rows.length > 0) {
      console.log('\n--- General Potential Duplicates in Table ---');
      console.table(generalRes.rows);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error finding duplicates:', err);
    process.exit(1);
  }
}

findDuplicateCheques();
