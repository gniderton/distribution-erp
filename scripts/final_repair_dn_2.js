const { pool } = require('../config/db');

async function repairDebitNoteData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Update Inventory Batch (Deduct Stock)
    const ibUpdate = await client.query('UPDATE inventory_batches SET quantity_remaining = 0 WHERE id = 314 RETURNING quantity_remaining');
    console.log('1. Inventory Batch 314 updated. New Qty:', ibUpdate.rows[0].quantity_remaining);
    
    // 2. Insert Stock Traceability (Audit Entry)
    const stInsert = await client.query(`
      INSERT INTO stock_traceability (batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type) 
      VALUES (314, 143, -240, 'OUT', 2, 'Debit Note') 
      RETURNING id
    `);
    console.log('2. Stock Traceability entry created. ID:', stInsert.rows[0].id);
    
    // 3. Update Debit Note Line (Correct Label to 'Good')
    const dnlUpdate = await client.query(`
      UPDATE debit_note_lines SET return_type = 'Good' WHERE id = 2 RETURNING return_type
    `);
    console.log('3. Debit Note Line 2 updated. New Type:', dnlUpdate.rows[0].return_type);
    
    await client.query('COMMIT');
    console.log('\n✅ All updates committed successfully.');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Transaction failed. Progress rolled back.');
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }
}

repairDebitNoteData();
