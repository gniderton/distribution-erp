const { pool } = require('./config/db');

(async () => {
  try {
    const invId = 186;
    console.log('Fixing invoice 186 GST cols...');
    
    // First, update taxable_amount and calculate gst splits
    await pool.query(`
      UPDATE purchase_invoice_headers
      SET 
        taxable_amount = total_net,
        cgst_amount = tax_amount / 2,
        sgst_amount = tax_amount / 2
      WHERE id = $1
    `, [invId]);
    
    const invRes = await pool.query(`
      SELECT 
        vendor_invoice_date,
        invoice_number,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        grand_total
      FROM purchase_invoice_headers WHERE id = $1
    `, [invId]);
    
    const inv = invRes.rows[0];
    console.log(inv);
    
    // Delete old journal entry
    const jRes = await pool.query(`SELECT id FROM journal_entries WHERE reference_id = $1 AND reference_type = 'GRN'`, [invId]);
    for(let row of jRes.rows) {
      await pool.query(`DELETE FROM journal_lines WHERE journal_entry_id = $1`, [row.id]);
      await pool.query(`DELETE FROM journal_entries WHERE id = $1`, [row.id]);
      console.log('Deleted old journal entry ID ' + row.id);
    }
    
    // Build ledger lines
    let ledgerLines = [];
    
    if (Number(inv.taxable_amount) > 0) {
      ledgerLines.push({ code: 12000, debit: Number(inv.taxable_amount), credit: 0 });
    }
    
    if (Number(inv.cgst_amount) > 0) {
      ledgerLines.push({ code: 22101, debit: Number(inv.cgst_amount), credit: 0 });
      ledgerLines.push({ code: 22102, debit: Number(inv.sgst_amount), credit: 0 });
    } else if (Number(inv.igst_amount) > 0) {
      ledgerLines.push({ code: 22103, debit: Number(inv.igst_amount), credit: 0 });
    }
    
    if (Number(inv.grand_total) > 0) {
      ledgerLines.push({ code: 21000, debit: 0, credit: Number(inv.grand_total) });
    }
    
    let debitSum = ledgerLines.reduce((s, l) => s + Number(l.debit), 0);
    let creditSum = ledgerLines.reduce((s, l) => s + Number(l.credit), 0);
    
    let diff = debitSum - creditSum;
    if (Math.abs(diff) > 0.001) {
      if (diff > 0) {
        ledgerLines.push({ code: 41005, debit: 0, credit: Math.abs(diff) });
      } else {
        ledgerLines.push({ code: 41005, debit: Math.abs(diff), credit: 0 });
      }
    }
    
    console.log('Ledger lines:', ledgerLines);
    
    const createRes = await pool.query(`
      SELECT create_journal_entry($1, $2, $3, $4, $5) as j_id
    `, [
      inv.vendor_invoice_date || new Date(),
      'GRN Inwarding: ' + inv.invoice_number,
      'GRN',
      invId,
      JSON.stringify(ledgerLines)
    ]);
    
    console.log('Created new journal entry ID:', createRes.rows[0].j_id);
    
  } catch(e) {
    console.error(e);
  } finally { process.exit(); }
})();
