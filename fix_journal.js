const { pool } = require('./config/db');

(async () => {
  try {
    console.log('Fetching invoice 186...');
    const invRes = await pool.query(`
      SELECT 
        vendor_invoice_date,
        invoice_number,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        grand_total
      FROM purchase_invoice_headers WHERE id = 186
    `);
    
    if (invRes.rows.length === 0) {
      console.log('Invoice not found.');
      process.exit();
    }
    
    const inv = invRes.rows[0];
    console.log(inv);
    
    // Delete old journal entry
    const jRes = await pool.query(`SELECT id FROM journal_entries WHERE reference_id = 186 AND reference_type = 'GRN'`);
    if (jRes.rows.length > 0) {
      const jId = jRes.rows[0].id;
      await pool.query(`DELETE FROM journal_lines WHERE journal_entry_id = $1`, [jId]);
      await pool.query(`DELETE FROM journal_entries WHERE id = $1`, [jId]);
      console.log('Deleted old zero-value journal entry.');
    }
    
    // Build ledger lines
    let ledgerLines = [];
    
    // Debit Inventory
    if (inv.taxable_amount > 0) {
      ledgerLines.push({ code: 12000, debit: inv.taxable_amount, credit: 0 });
    }
    
    // Debit GST
    if (inv.cgst_amount > 0) {
      ledgerLines.push({ code: 22101, debit: inv.cgst_amount, credit: 0 });
      ledgerLines.push({ code: 22102, debit: inv.sgst_amount, credit: 0 });
    } else if (inv.igst_amount > 0) {
      ledgerLines.push({ code: 22103, debit: inv.igst_amount, credit: 0 });
    }
    
    // Credit Accounts Payable
    if (inv.grand_total > 0) {
      ledgerLines.push({ code: 21000, debit: 0, credit: inv.grand_total });
    }
    
    // Calculate difference (rounding)
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
    
    // Create new journal entry
    const createRes = await pool.query(`
      SELECT create_journal_entry($1, $2, $3, $4, $5) as j_id
    `, [
      inv.vendor_invoice_date || new Date(),
      'GRN Inwarding: ' + inv.invoice_number,
      'GRN',
      186,
      JSON.stringify(ledgerLines)
    ]);
    
    console.log('Created new journal entry ID:', createRes.rows[0].j_id);
    
  } catch(e) {
    console.error(e);
  } finally { process.exit(); }
})();
