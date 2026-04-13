const { pool } = require('./config/db');

async function rebuild() {
    const client = await pool.connect();
    try {
        console.log('🏗️  PHOENIX RECONSTRUCTION ENGINE V3 (TARGET ALIGNMENT)...');
        await client.query('BEGIN');
        
        await client.query('TRUNCATE journal_entries_v2 CASCADE');

        // --- 0. OPENING BALANCES (Swapped Fix) ---
        console.log('🔄 Setting Swapped Opening Balances...');
        // Axis (4453) = 1700, IDFC (4454) = 12348
        const openingDate = '2024-04-01'; // Financial Start
        
        const axisEntry = await client.query(`INSERT INTO journal_entries_v2 (transaction_date, description, reference_type) VALUES ($1, 'Opening Balance: Axis', 'OPENING') RETURNING id`, [openingDate]);
        await client.query(`INSERT INTO journal_lines_v2 (journal_entry_id, account_id, debit, credit, bank_account_id) VALUES ($1, 4453, 1700, 0, 2)`, [axisEntry.rows[0].id]);
        
        const idfcEntry = await client.query(`INSERT INTO journal_entries_v2 (transaction_date, description, reference_type) VALUES ($1, 'Opening Balance: IDFC', 'OPENING') RETURNING id`, [openingDate]);
        await client.query(`INSERT INTO journal_lines_v2 (journal_entry_id, account_id, debit, credit, bank_account_id) VALUES ($1, 4454, 12348, 0, 3)`, [idfcEntry.rows[0].id]);

        // --- 1. PROCESS SALES INVOICES ---
        console.log('🔄 Reconstructing Sales Invoices...');
        const invoices = await client.query(`SELECT si.* FROM sales_invoices si WHERE si.status != 'Cancelled'`);
        for (const inv of invoices.rows) {
            const entryRes = await client.query(`INSERT INTO journal_entries_v2 (transaction_date, description, reference_type, reference_id, source_table, source_id) VALUES ($1, $2, 'SALES_INV', $3, 'sales_invoices', $4) RETURNING id`, 
                [inv.invoice_date, `Sales: ${inv.invoice_number}`, inv.id, inv.id]);
            const entryId = entryRes.rows[0].id;
            await client.query(`INSERT INTO journal_lines_v2 (journal_entry_id, account_id, debit, credit) VALUES ($1, 97, $2, 0)`, [entryId, Number(inv.grand_total)]); // AR
            await client.query(`INSERT INTO journal_lines_v2 (journal_entry_id, account_id, debit, credit) VALUES ($1, 12, 0, $2)`, [entryId, Number(inv.total_taxable)]); // Revenue
            if (Number(inv.total_cgst) > 0) await client.query(`INSERT INTO journal_lines_v2 (journal_entry_id, account_id, debit, credit) VALUES ($1, 9, 0, $2)`, [entryId, Number(inv.total_cgst)]);
            if (Number(inv.total_sgst) > 0) await client.query(`INSERT INTO journal_lines_v2 (journal_entry_id, account_id, debit, credit) VALUES ($1, 10, 0, $2)`, [entryId, Number(inv.total_sgst)]);
        }

        // --- 2. PROCESS INTERNAL TRANSFERS ---
        console.log('🔄 Reconstructing Bank/Cash Transfers...');
        const transfers = await client.query(`SELECT * FROM internal_transfers`);
        const coa_map = { 1: 3, 2: 4453, 3: 4454 }; 

        for (const t of transfers.rows) {
            const entryRes = await client.query(`INSERT INTO journal_entries_v2 (transaction_date, description, reference_type, reference_id, source_table, source_id) VALUES ($1, $2, 'TRANSFER', $3, 'internal_transfers', $3) RETURNING id`, 
                [t.transfer_date, t.description || `Transfer: ${t.remarks}`, t.id]);
            const fromAccount = coa_map[t.from_account_id] || 2;
            const toAccount = coa_map[t.to_account_id] || 2;
            await client.query(`INSERT INTO journal_lines_v2 (journal_entry_id, account_id, debit, credit, bank_account_id) VALUES ($1, $2, $3, 0, $4)`, [entryRes.rows[0].id, toAccount, Number(t.amount), t.to_account_id]);
            await client.query(`INSERT INTO journal_lines_v2 (journal_entry_id, account_id, debit, credit, bank_account_id) VALUES ($1, $2, 0, $3, $4)`, [entryRes.rows[0].id, fromAccount, Number(t.amount), t.from_account_id]);
        }

        // --- 3. INJECT UNCONSUMED STATEMENT ENTRIES (Source of Target Balance) ---
        console.log('🔄 Injecting Unconsumed Statement Entries...');
        const unconsumed = await client.query(`SELECT * FROM bank_statement_entries WHERE status != 'Exhausted'`);
        for (const bse of unconsumed.rows) {
            const bankAccount = bse.bank_name.toLowerCase().includes('idfc') ? 4454 : 4453;
            const amount = Number(bse.credit_amount) - Number(bse.consumed_amount);
            if (amount > 0) {
                const entryRes = await client.query(`INSERT INTO journal_entries_v2 (transaction_date, description, reference_type) VALUES ($1, $2, 'UNRECONCILED_STATEMENT') RETURNING id`, 
                    [bse.transaction_date, `Unconsumed Statement: ${bse.description}`]);
                await client.query(`INSERT INTO journal_lines_v2 (journal_entry_id, account_id, debit, credit, bank_account_id) VALUES ($1, $2, $3, 0, $4)`, 
                    [entryRes.rows[0].id, bankAccount, amount, bankAccount === 4454 ? 3 : 2]);
            }
        }

        await client.query('COMMIT');
        console.log('🏁 RECONSTRUCTION V3 COMPLETE.');
    } catch(e) {
        await client.query('ROLLBACK');
        console.error('❌ Reconstruction Failed:', e.message);
    } finally {
        client.release();
        process.exit();
    }
}
rebuild();
