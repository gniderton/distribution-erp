const { pool } = require('./config/db');

async function generateGapReport() {
    try {
        console.log('🕵️ MASTER FORENSIC GAP REPORT: UNLINKED BANK TRANSACTIONS\n');
        
        const gaps = [];

        // 1. Customer Payments
        const cp = await pool.query(`
            SELECT 'Customer Payment' as type, id as ref_id, amount, payment_date as date, payment_mode as mode, bank_id as bank 
            FROM customer_payments 
            WHERE bank_id IN (2, 3) AND bank_statement_entry_id IS NULL AND is_active = true
        `);
        gaps.push(...cp.rows);

        // 2. Vendor Payments
        const vp = await pool.query(`
            SELECT 'Vendor Payment' as type, id as ref_id, amount, payment_date as date, 'Online' as mode, bank_account_id as bank 
            FROM vendor_payments 
            WHERE bank_account_id IN (2, 3) AND bank_statement_entry_id IS NULL
        `);
        gaps.push(...vp.rows);

        // 3. Expenses
        const ex = await pool.query(`
            SELECT 'Expense' as type, id as ref_id, grand_total as amount, expense_date as date, 'Bank' as mode, payment_source_id as bank 
            FROM expenses 
            WHERE payment_source_id IN (2, 3) AND bank_statement_entry_id IS NULL
        `);
        gaps.push(...ex.rows);

        // 4. Loans
        const ln = await pool.query(`
            SELECT 'Loan (' || transaction_type || ')' as type, id as ref_id, amount, transaction_date as date, payment_mode as mode, 2 as bank 
            FROM loan_transactions 
            WHERE bank_statement_entry_id IS NULL
            -- Note: Loans use COA IDs, but I'm checking if they are 'Transacting' through Axis/IDFC buckets
        `);
        // Filter loans manually if needed or check journal lines
        gaps.push(...ln.rows);

        // 5. Internal Transfers
        const tfr_out = await pool.query(`
            SELECT 'Transfer (Out)' as type, id as ref_id, amount, transfer_date as date, 'Bank' as mode, from_account_id as bank 
            FROM internal_transfers 
            WHERE from_account_id IN (2, 3) AND from_bank_statement_entry_id IS NULL
        `);
        const tfr_in = await pool.query(`
            SELECT 'Transfer (In)' as type, id as ref_id, amount, transfer_date as date, 'Bank' as mode, to_account_id as bank 
            FROM internal_transfers 
            WHERE to_account_id IN (2, 3) AND to_bank_statement_entry_id IS NULL
        `);
        gaps.push(...tfr_out.rows, ...tfr_in.rows);

        // Format and Print
        const axisGaps = gaps.filter(g => g.bank === 2);
        const idfcGaps = gaps.filter(g => g.bank === 3);

        console.log('🏦 --- AXIS BANK (9157) GAPS ---');
        console.table(axisGaps);
        console.log(`\nTotal Axis Gap Inflow: ${axisGaps.reduce((acc, curr) => acc + (curr.type.includes('In') || curr.type.includes('Customer') || (curr.type.includes('Loan') && curr.type.includes('DISBURSEMENT')) ? parseFloat(curr.amount) : 0), 0)}`);
        console.log(`Total Axis Gap Outflow: ${axisGaps.reduce((acc, curr) => acc + (curr.type.includes('Out') || curr.type.includes('Vendor') || curr.type.includes('Expense') || (curr.type.includes('Loan') && curr.type.includes('INSTALLMENT')) ? parseFloat(curr.amount) : 0), 0)}`);

        console.log('\n🏦 --- IDFC BANK (0706) GAPS ---');
        console.table(idfcGaps);
        console.log(`\nTotal IDFC Gap Inflow: ${idfcGaps.reduce((acc, curr) => acc + (curr.type.includes('In') || curr.type.includes('Customer') ? parseFloat(curr.amount) : 0), 0)}`);
        console.log(`Total IDFC Gap Outflow: ${idfcGaps.reduce((acc, curr) => acc + (curr.type.includes('Out') || curr.type.includes('Vendor') || curr.type.includes('Expense') ? parseFloat(curr.amount) : 0), 0)}`);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

generateGapReport();
